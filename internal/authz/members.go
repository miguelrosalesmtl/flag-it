package authz

import (
	"context"
	"errors"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// Domain errors for member/role management. Handlers map these to HTTP statuses;
// the service stays transport-agnostic.
var (
	ErrUserNotFound = errors.New("authz: user not found")
	ErrRoleNotFound = errors.New("authz: role not found")
	ErrRoleScope    = errors.New("authz: role has the wrong scope")
)

// AddMember adds a user (by email) to a organization and, when roleKey is non-empty,
// assigns that organization-scoped role — atomically. The membership+assignment is a
// single business operation, so it lives here, not in the handler.
func (s *Service) AddMember(ctx context.Context, organizationID, email, roleKey string) (models.Membership, *models.RoleAssignment, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return models.Membership{}, nil, ErrUserNotFound
	}
	if err != nil {
		return models.Membership{}, nil, err
	}

	roleID := ""
	if roleKey != "" {
		role, err := s.resolveRole(ctx, organizationID, roleKey, models.ScopeOrganization)
		if err != nil {
			return models.Membership{}, nil, err
		}
		roleID = role.ID
	}
	return s.store.AddMember(ctx, user.ID, organizationID, roleID)
}

// GrantProjectRole grants a user (by email) a project-scoped role, ensuring they
// are a organization member first — atomically.
func (s *Service) GrantProjectRole(ctx context.Context, organizationID, projectID, email, roleKey string) (models.RoleAssignment, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return models.RoleAssignment{}, ErrUserNotFound
	}
	if err != nil {
		return models.RoleAssignment{}, err
	}
	role, err := s.resolveRole(ctx, organizationID, roleKey, models.ScopeProject)
	if err != nil {
		return models.RoleAssignment{}, err
	}
	return s.store.GrantProjectRole(ctx, user.ID, organizationID, projectID, role.ID)
}

// ListMembers returns a organization's members with their organization-scoped role.
func (s *Service) ListMembers(ctx context.Context, organizationID string) ([]models.Member, error) {
	return s.store.ListMembersByOrganization(ctx, organizationID)
}

// CreateRole creates a custom (non-system) role for a organization.
func (s *Service) CreateRole(ctx context.Context, organizationID, key, name, description string, scope models.ScopeType, perms []models.Permission) (models.Role, error) {
	return s.store.CreateRole(ctx, organizationID, key, name, description, scope, perms)
}

// ListRoles returns a organization's roles.
func (s *Service) ListRoles(ctx context.Context, organizationID string) ([]models.Role, error) {
	return s.store.ListRolesByOrganization(ctx, organizationID)
}

// resolveRole looks a role up by key and enforces the expected scope.
func (s *Service) resolveRole(ctx context.Context, organizationID, key string, want models.ScopeType) (models.Role, error) {
	role, err := s.store.GetRoleByKey(ctx, organizationID, key)
	if errors.Is(err, store.ErrNotFound) {
		return models.Role{}, ErrRoleNotFound
	}
	if err != nil {
		return models.Role{}, err
	}
	if role.Scope != want {
		return models.Role{}, ErrRoleScope
	}
	return role, nil
}
