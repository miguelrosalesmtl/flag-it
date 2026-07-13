package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type projectOutput struct {
	Body models.Project
}

type listProjectsOutput struct {
	Body struct {
		Projects []models.Project `json:"projects"`
	}
}

type createProjectInput struct {
	TenantSlug string `path:"tenantSlug"`
	Body       struct {
		Key  string `json:"key"`
		Name string `json:"name"`
	}
}

type createProjectOutput struct {
	Body struct {
		Project      models.Project       `json:"project"`
		Environments []models.Environment `json:"environments"`
	}
}

// projectPath addresses a project by tenant slug + project key (shared).
type projectPath struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
}

type updateProjectInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	Body       struct {
		Name string `json:"name"`
	}
}

type listEnvironmentsOutput struct {
	Body struct {
		Environments []models.Environment `json:"environments"`
	}
}

type environmentOutput struct {
	Body models.Environment
}

type createEnvironmentInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	Body       struct {
		Key  string `json:"key"`
		Name string `json:"name"`
	}
}

func (s *Server) registerProjects() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-projects", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}/projects",
		Summary: "List projects the caller can read", Tags: []string{"Projects"}, Security: bearer,
	}, func(ctx context.Context, in *tenantPath) (*listProjectsOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		subject, err := s.authz.Subject(ctx, userID(ctx))
		if err != nil {
			return nil, huma.Error500InternalServerError("authorization failed")
		}
		visible, tenantWide, err := s.catalog.ListReadableProjects(ctx, subject, tenant.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		if !tenantWide && len(visible) == 0 {
			return nil, huma.Error403Forbidden("forbidden")
		}
		out := &listProjectsOutput{}
		out.Body.Projects = visible
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-project", Method: http.MethodPost, Path: "/api/v1/tenants/{tenantSlug}/projects",
		Summary: "Create a project (requires project.create); seeds production + staging", Tags: []string{"Projects"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createProjectInput) (*createProjectOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectCreate, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		if in.Body.Key == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("key and name are required")
		}
		project, envs, err := s.catalog.CreateProject(ctx, tenant.ID, in.Body.Key, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: tenant.ID, ProjectID: project.ID,
			Action: "project.created", ResourceType: "project", ResourceKey: project.Key})
		out := &createProjectOutput{}
		out.Body.Project = project
		out.Body.Environments = envs
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-project", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}/projects/{projectKey}",
		Summary: "Get a project (requires project.read)", Tags: []string{"Projects"}, Security: bearer,
	}, func(ctx context.Context, in *projectPath) (*projectOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		return &projectOutput{Body: project}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "update-project", Method: http.MethodPatch, Path: "/api/v1/tenants/{tenantSlug}/projects/{projectKey}",
		Summary: "Update project name (requires project.update)", Tags: []string{"Projects"}, Security: bearer,
	}, func(ctx context.Context, in *updateProjectInput) (*projectOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectUpdate, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if in.Body.Name == "" {
			return nil, huma.Error400BadRequest("name is required")
		}
		updated, err := s.catalog.UpdateProject(ctx, project.ID, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "project.updated", ResourceType: "project", ResourceKey: project.Key})
		return &projectOutput{Body: updated}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-project", Method: http.MethodDelete, Path: "/api/v1/tenants/{tenantSlug}/projects/{projectKey}",
		Summary: "Delete a project (requires project.delete); cascades", Tags: []string{"Projects"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *projectPath) (*noContent, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectDelete, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if err := s.catalog.DeleteProject(ctx, project.ID); err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		// project_id omitted (the project is gone); keep the entry under the tenant.
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID,
			Action: "project.deleted", ResourceType: "project", ResourceKey: project.Key})
		return &noContent{}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-environments", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}/projects/{projectKey}/environments",
		Summary: "List a project's environments (requires project.read)", Tags: []string{"Environments"}, Security: bearer,
	}, func(ctx context.Context, in *projectPath) (*listEnvironmentsOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		envs, err := s.catalog.ListEnvironments(ctx, project.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listEnvironmentsOutput{}
		out.Body.Environments = envs
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-environment", Method: http.MethodPost, Path: "/api/v1/tenants/{tenantSlug}/projects/{projectKey}/environments",
		Summary: "Create an environment (requires project.update); backfills flag configs", Tags: []string{"Environments"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createEnvironmentInput) (*environmentOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectUpdate, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if in.Body.Key == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("key and name are required")
		}
		env, err := s.catalog.CreateEnvironment(ctx, project.ID, in.Body.Key, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "environment.created", ResourceType: "environment", ResourceKey: env.Key})
		return &environmentOutput{Body: env}, nil
	})
}
