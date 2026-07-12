package store

import (
	"context"
	"fmt"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// Atomic multi-write workflows for the identity/RBAC domain. Each wraps several
// writes in a single transaction so a partial failure never leaves a membership
// without its role, or a superuser without their tenant.

// AddMember creates (or refreshes) a tenant membership and, when tenantRoleID is
// non-empty, assigns that tenant-scoped role — atomically.
func (s *Store) AddMember(ctx context.Context, userID, tenantID, tenantRoleID string) (models.Membership, *models.RoleAssignment, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.Membership{}, nil, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	membership, err := insertMembership(ctx, tx, userID, tenantID)
	if err != nil {
		return models.Membership{}, nil, err
	}
	var assignment *models.RoleAssignment
	if tenantRoleID != "" {
		a, err := assignTenantRole(ctx, tx, userID, tenantRoleID, tenantID)
		if err != nil {
			return models.Membership{}, nil, err
		}
		assignment = &a
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Membership{}, nil, fmt.Errorf("store: commit: %w", err)
	}
	return membership, assignment, nil
}

// GrantProjectRole ensures the user is a member of the tenant and assigns them a
// project-scoped role — atomically.
func (s *Store) GrantProjectRole(ctx context.Context, userID, tenantID, projectID, roleID string) (models.RoleAssignment, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.RoleAssignment{}, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	if _, err := insertMembership(ctx, tx, userID, tenantID); err != nil {
		return models.RoleAssignment{}, err
	}
	assignment, err := assignProjectRole(ctx, tx, userID, roleID, projectID)
	if err != nil {
		return models.RoleAssignment{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.RoleAssignment{}, fmt.Errorf("store: commit: %w", err)
	}
	return assignment, nil
}

// Bootstrap creates the first superuser and, optionally, the first tenant (with
// its seeded roles) — atomically. Used by first-run setup.
func (s *Store) Bootstrap(ctx context.Context, email, passwordHash, fullName, tenantSlug, tenantName string) (models.User, *models.Tenant, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.User{}, nil, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	user, err := insertUser(ctx, tx, email, passwordHash, fullName, true)
	if err != nil {
		return models.User{}, nil, err
	}
	var tenant *models.Tenant
	if tenantSlug != "" {
		t, err := insertTenantWithRoles(ctx, tx, tenantSlug, tenantName)
		if err != nil {
			return models.User{}, nil, err
		}
		tenant = &t
	}
	if err := tx.Commit(ctx); err != nil {
		return models.User{}, nil, fmt.Errorf("store: commit: %w", err)
	}
	return user, tenant, nil
}
