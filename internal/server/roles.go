package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type listRolesOutput struct {
	Body struct {
		Roles []models.Role `json:"roles"`
	}
}

type createRoleInput struct {
	TenantSlug string `path:"tenantSlug"`
	Body       struct {
		Key         string              `json:"key"`
		Name        string              `json:"name"`
		Description string              `json:"description,omitempty"`
		Scope       models.ScopeType    `json:"scope" enum:"tenant,project"`
		Permissions []models.Permission `json:"permissions,omitempty"`
	}
}

type roleOutput struct {
	Body models.Role
}

type listMembersOutput struct {
	Body struct {
		Members []models.Member `json:"members"`
	}
}

type addMemberInput struct {
	TenantSlug string `path:"tenantSlug"`
	Body       struct {
		Email string `json:"email" format:"email"`
		Role  string `json:"role,omitempty" doc:"optional tenant-scoped role key (e.g. tenant_admin)"`
	}
}

type addMemberOutput struct {
	Body struct {
		Membership models.Membership      `json:"membership"`
		Assignment *models.RoleAssignment `json:"assignment,omitempty"`
	}
}

type grantProjectRoleInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	Body       struct {
		Email string `json:"email" format:"email"`
		Role  string `json:"role" doc:"project-scoped role key (e.g. writer, reader)"`
	}
}

type roleAssignmentOutput struct {
	Body models.RoleAssignment
}

func (s *Server) registerRoles() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-roles", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}/roles",
		Summary: "List a tenant's roles (requires role.manage)", Tags: []string{"Roles"}, Security: bearer,
	}, func(ctx context.Context, in *tenantPath) (*listRolesOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermRoleManage, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		roles, err := s.authz.ListRoles(ctx, tenant.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listRolesOutput{}
		out.Body.Roles = roles
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-role", Method: http.MethodPost, Path: "/api/v1/tenants/{tenantSlug}/roles",
		Summary: "Create a custom role (requires role.manage)", Tags: []string{"Roles"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createRoleInput) (*roleOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermRoleManage, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		if in.Body.Key == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("key and name are required")
		}
		role, err := s.authz.CreateRole(ctx, tenant.ID, in.Body.Key, in.Body.Name, in.Body.Description, in.Body.Scope, in.Body.Permissions)
		if err != nil {
			return nil, huma.Error400BadRequest(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: tenant.ID,
			Action: "role.created", ResourceType: "role", ResourceKey: in.Body.Key,
			Data: jsonData(map[string]any{"scope": in.Body.Scope, "permissions": in.Body.Permissions})})
		return &roleOutput{Body: role}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-members", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}/members",
		Summary: "List a tenant's members (requires member.manage)", Tags: []string{"Members"}, Security: bearer,
	}, func(ctx context.Context, in *tenantPath) (*listMembersOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermMemberManage, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		members, err := s.authz.ListMembers(ctx, tenant.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listMembersOutput{}
		out.Body.Members = members
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "add-member", Method: http.MethodPost, Path: "/api/v1/tenants/{tenantSlug}/members",
		Summary: "Add a member to a tenant (requires member.manage)", Tags: []string{"Members"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *addMemberInput) (*addMemberOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermMemberManage, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		membership, assignment, err := s.authz.AddMember(ctx, tenant.ID, in.Body.Email, in.Body.Role)
		if err != nil {
			return nil, authzError(err)
		}
		out := &addMemberOutput{}
		out.Body.Membership = membership
		out.Body.Assignment = assignment
		s.audit(ctx, models.AuditEntry{TenantID: tenant.ID,
			Action: "member.added", ResourceType: "membership", ResourceKey: in.Body.Email,
			Data: jsonData(map[string]any{"role": in.Body.Role})})
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "grant-project-role", Method: http.MethodPost, Path: "/api/v1/tenants/{tenantSlug}/projects/{projectKey}/roles",
		Summary: "Grant a user a project-scoped role (requires member.manage)", Tags: []string{"Members"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *grantProjectRoleInput) (*roleAssignmentOutput, error) {
		tenant, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermMemberManage, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		assignment, err := s.authz.GrantProjectRole(ctx, tenant.ID, project.ID, in.Body.Email, in.Body.Role)
		if err != nil {
			return nil, authzError(err)
		}
		s.audit(ctx, models.AuditEntry{TenantID: tenant.ID, ProjectID: project.ID,
			Action: "role.granted", ResourceType: "role_assignment", ResourceKey: in.Body.Email,
			Data: jsonData(map[string]any{"role": in.Body.Role, "scope": "project"})})
		return &roleAssignmentOutput{Body: assignment}, nil
	})
}
