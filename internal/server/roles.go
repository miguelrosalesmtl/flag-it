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

type listPermissionsOutput struct {
	Body struct {
		Permissions []models.Permission `json:"permissions"`
	}
}

type createRoleInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	Body             struct {
		Key         string              `json:"key"`
		Name        string              `json:"name"`
		Description string              `json:"description,omitempty"`
		Scope       models.ScopeType    `json:"scope" enum:"organization,project"`
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
	OrganizationSlug string `path:"organizationSlug"`
	Body             struct {
		Email string `json:"email" format:"email"`
		Role  string `json:"role,omitempty" doc:"optional organization-scoped role key (e.g. organization_admin)"`
	}
}

type addMemberOutput struct {
	Body struct {
		Membership models.Membership      `json:"membership"`
		Assignment *models.RoleAssignment `json:"assignment,omitempty"`
	}
}

type grantProjectRoleInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	Body             struct {
		Email string `json:"email" format:"email"`
		Role  string `json:"role" doc:"project-scoped role key (e.g. writer, reader)"`
	}
}

type roleAssignmentOutput struct {
	Body models.RoleAssignment
}

func (s *Server) registerRoles() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-permissions", Method: http.MethodGet, Path: "/api/v1/permissions",
		Summary: "The permission vocabulary roles can grant", Tags: []string{"Roles"}, Security: bearer,
	}, func(ctx context.Context, _ *struct{}) (*listPermissionsOutput, error) {
		out := &listPermissionsOutput{}
		out.Body.Permissions = models.AllPermissions
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-roles", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}/roles",
		Summary: "List a organization's roles (requires role.manage)", Tags: []string{"Roles"}, Security: bearer,
	}, func(ctx context.Context, in *organizationPath) (*listRolesOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermRoleManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		roles, err := s.authz.ListRoles(ctx, organization.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listRolesOutput{}
		out.Body.Roles = roles
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-role", Method: http.MethodPost, Path: "/api/v1/organizations/{organizationSlug}/roles",
		Summary: "Create a custom role (requires role.manage)", Tags: []string{"Roles"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createRoleInput) (*roleOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermRoleManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		if in.Body.Key == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("key and name are required")
		}
		role, err := s.authz.CreateRole(ctx, organization.ID, in.Body.Key, in.Body.Name, in.Body.Description, in.Body.Scope, in.Body.Permissions)
		if err != nil {
			return nil, huma.Error400BadRequest(err.Error())
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "role.created", ResourceType: "role", ResourceKey: in.Body.Key,
			Data: jsonData(map[string]any{"scope": in.Body.Scope, "permissions": in.Body.Permissions})})
		return &roleOutput{Body: role}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-members", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}/members",
		Summary: "List a organization's members (requires member.manage)", Tags: []string{"Members"}, Security: bearer,
	}, func(ctx context.Context, in *organizationPath) (*listMembersOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermMemberManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		members, err := s.authz.ListMembers(ctx, organization.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listMembersOutput{}
		out.Body.Members = members
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "add-member", Method: http.MethodPost, Path: "/api/v1/organizations/{organizationSlug}/members",
		Summary: "Add a member to a organization (requires member.manage)", Tags: []string{"Members"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *addMemberInput) (*addMemberOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermMemberManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		membership, assignment, err := s.authz.AddMember(ctx, organization.ID, in.Body.Email, in.Body.Role)
		if err != nil {
			return nil, authzError(err)
		}
		out := &addMemberOutput{}
		out.Body.Membership = membership
		out.Body.Assignment = assignment
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "member.added", ResourceType: "membership", ResourceKey: in.Body.Email,
			Data: jsonData(map[string]any{"role": in.Body.Role})})
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "grant-project-role", Method: http.MethodPost, Path: "/api/v1/organizations/{organizationSlug}/projects/{projectKey}/roles",
		Summary: "Grant a user a project-scoped role (requires member.manage)", Tags: []string{"Members"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *grantProjectRoleInput) (*roleAssignmentOutput, error) {
		organization, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermMemberManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		assignment, err := s.authz.GrantProjectRole(ctx, organization.ID, project.ID, in.Body.Email, in.Body.Role)
		if err != nil {
			return nil, authzError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID, ProjectID: project.ID,
			Action: "role.granted", ResourceType: "role_assignment", ResourceKey: in.Body.Email,
			Data: jsonData(map[string]any{"role": in.Body.Role, "scope": "project"})})
		return &roleAssignmentOutput{Body: assignment}, nil
	})
}
