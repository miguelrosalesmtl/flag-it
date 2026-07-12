package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type tenantOutput struct {
	Body models.Tenant
}

type listTenantsOutput struct {
	Body struct {
		Tenants []models.Tenant `json:"tenants"`
	}
}

type createTenantInput struct {
	Body struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	}
}

// tenantPath addresses a tenant by its slug.
type tenantPath struct {
	TenantSlug string `path:"tenantSlug"`
}

type updateTenantInput struct {
	TenantSlug string `path:"tenantSlug"`
	Body       struct {
		Name string `json:"name"`
	}
}

func (s *Server) registerTenants() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-tenants", Method: http.MethodGet, Path: "/api/v1/tenants",
		Summary: "List all tenants (superuser only)", Tags: []string{"Tenants"}, Security: bearer,
	}, func(ctx context.Context, _ *struct{}) (*listTenantsOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		tenants, err := s.catalog.ListTenants(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listTenantsOutput{}
		out.Body.Tenants = tenants
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-tenant", Method: http.MethodPost, Path: "/api/v1/tenants",
		Summary: "Create a tenant (superuser only); seeds default roles", Tags: []string{"Tenants"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createTenantInput) (*tenantOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		if in.Body.Slug == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("slug and name are required")
		}
		tenant, err := s.catalog.CreateTenant(ctx, in.Body.Slug, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: tenant.ID,
			Action: "tenant.created", ResourceType: "tenant", ResourceKey: tenant.Slug})
		return &tenantOutput{Body: tenant}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-tenant", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}",
		Summary: "Get a tenant by slug (requires tenant.read)", Tags: []string{"Tenants"}, Security: bearer,
	}, func(ctx context.Context, in *tenantPath) (*tenantOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermTenantRead, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		return &tenantOutput{Body: tenant}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "update-tenant", Method: http.MethodPatch, Path: "/api/v1/tenants/{tenantSlug}",
		Summary: "Update tenant name (requires tenant.update)", Tags: []string{"Tenants"}, Security: bearer,
	}, func(ctx context.Context, in *updateTenantInput) (*tenantOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermTenantUpdate, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		if in.Body.Name == "" {
			return nil, huma.Error400BadRequest("name is required")
		}
		updated, err := s.catalog.UpdateTenant(ctx, tenant.ID, in.Body.Name)
		if err != nil {
			return nil, storeError(err, "tenant not found")
		}
		s.audit(ctx, models.AuditEntry{TenantID: tenant.ID,
			Action: "tenant.updated", ResourceType: "tenant", ResourceKey: tenant.Slug})
		return &tenantOutput{Body: updated}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-tenant", Method: http.MethodDelete, Path: "/api/v1/tenants/{tenantSlug}",
		Summary: "Delete a tenant (superuser only); cascades", Tags: []string{"Tenants"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *tenantPath) (*noContent, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.catalog.DeleteTenant(ctx, tenant.ID); err != nil {
			return nil, storeError(err, "tenant not found")
		}
		// Platform-level (no tenant_id): the tenant's own audit rows cascade away.
		s.audit(ctx, models.AuditEntry{Action: "tenant.deleted", ResourceType: "tenant", ResourceKey: tenant.Slug})
		return &noContent{}, nil
	})
}
