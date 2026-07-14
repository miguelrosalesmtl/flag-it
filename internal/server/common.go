package server

import (
	"context"
	"errors"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/authz"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// noContent is the output type for 204 responses (no body).
type noContent struct{}

// resolveOrganization resolves a URL organization slug to the organization (404 if unknown).
func (s *Server) resolveOrganization(ctx context.Context, slug string) (models.Organization, error) {
	t, err := s.catalog.OrganizationBySlug(ctx, slug)
	if err != nil {
		return models.Organization{}, storeError(err, "organization not found")
	}
	return t, nil
}

// resolveProject resolves a URL project key within a organization to the project.
func (s *Server) resolveProject(ctx context.Context, organizationID, projectKey string) (models.Project, error) {
	p, err := s.catalog.ProjectByKey(ctx, organizationID, projectKey)
	if err != nil {
		return models.Project{}, storeError(err, "project not found in organization")
	}
	return p, nil
}

// resolveScope resolves a organization slug + project key to both records — the common
// prelude for project-scoped handlers.
func (s *Server) resolveScope(ctx context.Context, organizationSlug, projectKey string) (models.Organization, models.Project, error) {
	organization, err := s.resolveOrganization(ctx, organizationSlug)
	if err != nil {
		return models.Organization{}, models.Project{}, err
	}
	project, err := s.resolveProject(ctx, organization.ID, projectKey)
	if err != nil {
		return models.Organization{}, models.Project{}, err
	}
	return organization, project, nil
}

// resolveEnv returns an environment by key within a project.
func (s *Server) resolveEnv(ctx context.Context, projectID, envKey string) (models.Environment, error) {
	env, err := s.catalog.EnvByKey(ctx, projectID, envKey)
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

// authzError maps member/role service errors to HTTP statuses.
func authzError(err error) error {
	switch {
	case errors.Is(err, authz.ErrUserNotFound):
		return huma.Error404NotFound("user not found")
	case errors.Is(err, authz.ErrRoleNotFound):
		return huma.Error400BadRequest("unknown role")
	case errors.Is(err, authz.ErrRoleScope):
		return huma.Error400BadRequest("role has the wrong scope")
	default:
		return huma.Error500InternalServerError(err.Error())
	}
}
