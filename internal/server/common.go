package server

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// noContent is the output type for 204 responses (no body).
type noContent struct{}

// resolveTenant resolves a URL tenant slug to the tenant (404 if unknown).
func (s *Server) resolveTenant(ctx context.Context, slug string) (models.Tenant, error) {
	t, err := s.store.GetTenantBySlug(ctx, slug)
	if err != nil {
		return models.Tenant{}, storeError(err, "tenant not found")
	}
	return t, nil
}

// resolveProject resolves a URL project key within a tenant to the project.
func (s *Server) resolveProject(ctx context.Context, tenantID, projectKey string) (models.Project, error) {
	p, err := s.store.GetProjectByKey(ctx, tenantID, projectKey)
	if err != nil {
		return models.Project{}, storeError(err, "project not found in tenant")
	}
	return p, nil
}

// resolveScope resolves a tenant slug + project key to both records — the common
// prelude for project-scoped handlers.
func (s *Server) resolveScope(ctx context.Context, tenantSlug, projectKey string) (models.Tenant, models.Project, error) {
	tenant, err := s.resolveTenant(ctx, tenantSlug)
	if err != nil {
		return models.Tenant{}, models.Project{}, err
	}
	project, err := s.resolveProject(ctx, tenant.ID, projectKey)
	if err != nil {
		return models.Tenant{}, models.Project{}, err
	}
	return tenant, project, nil
}

// resolveEnv returns an environment by key within a project.
func (s *Server) resolveEnv(ctx context.Context, projectID, envKey string) (models.Environment, error) {
	env, err := s.store.GetEnvironmentByKey(ctx, projectID, envKey)
	if err != nil {
		return models.Environment{}, storeError(err, "environment not found")
	}
	return env, nil
}

// flagError maps flag-layer errors to huma HTTP errors.
func flagError(err error) error {
	var verr *flags.ValidationError
	switch {
	case errors.As(err, &verr):
		return huma.Error400BadRequest(verr.Error())
	case errors.Is(err, store.ErrNotFound):
		return huma.Error404NotFound(err.Error())
	default:
		return huma.Error500InternalServerError(err.Error())
	}
}

// storeError maps store errors to huma errors (ErrNotFound → 404).
func storeError(err error, notFoundMsg string) error {
	if errors.Is(err, store.ErrNotFound) {
		return huma.Error404NotFound(notFoundMsg)
	}
	return huma.Error500InternalServerError(err.Error())
}
