package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type organizationOutput struct {
	Body models.Organization
}

type listOrganizationsOutput struct {
	Body struct {
		Organizations []models.Organization `json:"organizations"`
	}
}

type createOrganizationInput struct {
	Body struct {
		Slug string `json:"slug"`
		Name string `json:"name"`
	}
}

// organizationPath addresses a organization by its slug.
type organizationPath struct {
	OrganizationSlug string `path:"organizationSlug"`
}

type updateOrganizationInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	Body             struct {
		Name string `json:"name"`
	}
}

func (s *Server) registerOrganizations() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-organizations", Method: http.MethodGet, Path: "/api/v1/organizations",
		Summary: "List all organizations (superuser only)", Tags: []string{"Organizations"}, Security: bearer,
	}, func(ctx context.Context, _ *struct{}) (*listOrganizationsOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		organizations, err := s.catalog.ListOrganizations(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listOrganizationsOutput{}
		out.Body.Organizations = organizations
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-organization", Method: http.MethodPost, Path: "/api/v1/organizations",
		Summary: "Create a organization (superuser only); seeds default roles", Tags: []string{"Organizations"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createOrganizationInput) (*organizationOutput, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		if in.Body.Slug == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("slug and name are required")
		}
		organization, err := s.catalog.CreateOrganization(ctx, in.Body.Slug, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "organization.created", ResourceType: "organization", ResourceKey: organization.Slug})
		return &organizationOutput{Body: organization}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-organization", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}",
		Summary: "Get a organization by slug (requires organization.read)", Tags: []string{"Organizations"}, Security: bearer,
	}, func(ctx context.Context, in *organizationPath) (*organizationOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermOrganizationRead, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		return &organizationOutput{Body: organization}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "update-organization", Method: http.MethodPatch, Path: "/api/v1/organizations/{organizationSlug}",
		Summary: "Update organization name (requires organization.update)", Tags: []string{"Organizations"}, Security: bearer,
	}, func(ctx context.Context, in *updateOrganizationInput) (*organizationOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermOrganizationUpdate, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		if in.Body.Name == "" {
			return nil, huma.Error400BadRequest("name is required")
		}
		updated, err := s.catalog.UpdateOrganization(ctx, organization.ID, in.Body.Name)
		if err != nil {
			return nil, storeError(err, "organization not found")
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "organization.updated", ResourceType: "organization", ResourceKey: organization.Slug})
		return &organizationOutput{Body: updated}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-organization", Method: http.MethodDelete, Path: "/api/v1/organizations/{organizationSlug}",
		Summary: "Delete a organization (superuser only); cascades", Tags: []string{"Organizations"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *organizationPath) (*noContent, error) {
		if err := s.requireSuperuser(ctx); err != nil {
			return nil, err
		}
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.catalog.DeleteOrganization(ctx, organization.ID); err != nil {
			return nil, storeError(err, "organization not found")
		}
		// Platform-level (no organization_id): the organization's own audit rows cascade away.
		s.audit(ctx, models.AuditEntry{Action: "organization.deleted", ResourceType: "organization", ResourceKey: organization.Slug})
		return &noContent{}, nil
	})
}
