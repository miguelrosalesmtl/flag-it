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
	OrganizationSlug string `path:"organizationSlug"`
	Body             struct {
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

// projectPath addresses a project by organization slug + project key (shared).
type projectPath struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
}

type updateProjectInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	Body             struct {
		Name string `json:"name"`
	}
}

type listEnvironmentsInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	Search           string `query:"search" doc:"filter by environment name or key"`
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
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	Body             struct {
		Key  string `json:"key"`
		Name string `json:"name"`
	}
}

func (s *Server) registerProjects() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-projects", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}/projects",
		Summary: "List projects the caller can read", Tags: []string{"Projects"}, Security: bearer,
	}, func(ctx context.Context, in *organizationPath) (*listProjectsOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		subject, err := s.authz.Subject(ctx, userID(ctx))
		if err != nil {
			return nil, huma.Error500InternalServerError("authorization failed")
		}
		visible, organizationWide, err := s.catalog.ListReadableProjects(ctx, subject, organization.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		if !organizationWide && len(visible) == 0 {
			return nil, huma.Error403Forbidden("forbidden")
		}
		out := &listProjectsOutput{}
		out.Body.Projects = visible
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-project", Method: http.MethodPost, Path: "/api/v1/organizations/{organizationSlug}/projects",
		Summary: "Create a project (requires project.create); seeds production + staging", Tags: []string{"Projects"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createProjectInput) (*createProjectOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectCreate, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		if in.Body.Key == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("key and name are required")
		}
		project, envs, err := s.catalog.CreateProject(ctx, organization.ID, in.Body.Key, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID, ProjectID: project.ID,
			Action: "project.created", ResourceType: "project", ResourceKey: project.Key})
		out := &createProjectOutput{}
		out.Body.Project = project
		out.Body.Environments = envs
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-project", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}/projects/{projectKey}",
		Summary: "Get a project (requires project.read)", Tags: []string{"Projects"}, Security: bearer,
	}, func(ctx context.Context, in *projectPath) (*projectOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectRead, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		return &projectOutput{Body: project}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "update-project", Method: http.MethodPatch, Path: "/api/v1/organizations/{organizationSlug}/projects/{projectKey}",
		Summary: "Update project name (requires project.update)", Tags: []string{"Projects"}, Security: bearer,
	}, func(ctx context.Context, in *updateProjectInput) (*projectOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectUpdate, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if in.Body.Name == "" {
			return nil, huma.Error400BadRequest("name is required")
		}
		updated, err := s.catalog.UpdateProject(ctx, project.ID, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "project.updated", ResourceType: "project", ResourceKey: project.Key})
		return &projectOutput{Body: updated}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-project", Method: http.MethodDelete, Path: "/api/v1/organizations/{organizationSlug}/projects/{projectKey}",
		Summary: "Delete a project (requires project.delete); cascades", Tags: []string{"Projects"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *projectPath) (*noContent, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectDelete, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if err := s.catalog.DeleteProject(ctx, project.ID); err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		// project_id omitted (the project is gone); keep the entry under the organization.
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID,
			Action: "project.deleted", ResourceType: "project", ResourceKey: project.Key})
		return &noContent{}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-environments", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}/projects/{projectKey}/environments",
		Summary: "List a project's environments (requires project.read)", Tags: []string{"Environments"}, Security: bearer,
	}, func(ctx context.Context, in *listEnvironmentsInput) (*listEnvironmentsOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectRead, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		envs, err := s.catalog.ListEnvironments(ctx, project.ID, in.Search)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listEnvironmentsOutput{}
		out.Body.Environments = envs
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-environment", Method: http.MethodPost, Path: "/api/v1/organizations/{organizationSlug}/projects/{projectKey}/environments",
		Summary: "Create an environment (requires project.update); backfills flag configs", Tags: []string{"Environments"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createEnvironmentInput) (*environmentOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermProjectUpdate, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if in.Body.Key == "" || in.Body.Name == "" {
			return nil, huma.Error400BadRequest("key and name are required")
		}
		env, err := s.catalog.CreateEnvironment(ctx, project.ID, in.Body.Key, in.Body.Name)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "environment.created", ResourceType: "environment", ResourceKey: env.Key})
		return &environmentOutput{Body: env}, nil
	})
}
