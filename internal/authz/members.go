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

// AddMember adds a user (by email) to a tenant and, when roleKey is non-empty,
// assigns that tenant-scoped role — atomically. The membership+assignment is a
// single business operation, so it lives here, not in the handler.
func (s *Service) AddMember(ctx context.Context, tenantID, email, roleKey string) (models.Membership, *models.RoleAssignment, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return models.Membership{}, nil, ErrUserNotFound
	}
	if err != nil {
		return models.Membership{}, nil, err
	}

	roleID := ""
	if roleKey != "" {
		role, err := s.resolveRole(ctx, tenantID, roleKey, models.ScopeTenant)
		if err != nil {
			return models.Membership{}, nil, err
		}
		roleID = role.ID
	}
	return s.store.AddMember(ctx, user.ID, tenantID, roleID)
}

// GrantProjectRole grants a user (by email) a project-scoped role, ensuring they
// are a tenant member first — atomically.
func (s *Service) GrantProjectRole(ctx context.Context, tenantID, projectID, email, roleKey string) (models.RoleAssignment, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return models.RoleAssignment{}, ErrUserNotFound
	}
	if err != nil {
		return models.RoleAssignment{}, err
	}
	role, err := s.resolveRole(ctx, tenantID, roleKey, models.ScopeProject)
	if err != nil {
		return models.RoleAssignment{}, err
	}
	return s.store.GrantProjectRole(ctx, user.ID, tenantID, projectID, role.ID)
}

// ListMembers returns a tenant's members with their tenant-scoped role.
func (s *Service) ListMembers(ctx context.Context, tenantID string) ([]models.Member, error) {
	return s.store.ListMembersByTenant(ctx, tenantID)
}

// CreateRole creates a custom (non-system) role for a tenant.
func (s *Service) CreateRole(ctx context.Context, tenantID, key, name, description string, scope models.ScopeType, perms []models.Permission) (models.Role, error) {
	return s.store.CreateRole(ctx, tenantID, key, name, description, scope, perms)
}

// ListRoles returns a tenant's roles.
func (s *Service) ListRoles(ctx context.Context, tenantID string) ([]models.Role, error) {
	return s.store.ListRolesByTenant(ctx, tenantID)
}

// resolveRole looks a role up by key and enforces the expected scope.
func (s *Service) resolveRole(ctx context.Context, tenantID, key string, want models.ScopeType) (models.Role, error) {
	role, err := s.store.GetRoleByKey(ctx, tenantID, key)
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
