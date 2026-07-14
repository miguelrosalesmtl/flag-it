package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// querier is satisfied by both *pgxpool.Pool and pgx.Tx, so role helpers can run
// standalone or inside the organization-creation transaction.
type querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

const roleColumns = `id, organization_id, key, name, description, scope, is_system, created_at, updated_at`
const roleAssignmentColumns = `id, user_id, role_id, scope_type, organization_id, project_id, created_at, updated_at`

// defaultRoles are seeded (as system roles) into every new organization.
var defaultRoles = []struct {
	Key, Name, Description string
	Scope                  models.ScopeType
	Permissions            []models.Permission
}{
	{"organization_admin", "Organization Admin", "Full control of the organization.", models.ScopeOrganization, models.AllPermissions},
	{"writer", "Writer", "Create and edit flags in a project.", models.ScopeProject,
		[]models.Permission{models.PermProjectRead, models.PermFlagRead, models.PermFlagWrite, models.PermFlagDelete}},
	{"reader", "Reader", "View flags in a project.", models.ScopeProject,
		[]models.Permission{models.PermProjectRead, models.PermFlagRead}},
}

// seedDefaultRoles creates the system roles for a organization. Runs inside the
// organization-creation transaction.
func seedDefaultRoles(ctx context.Context, q querier, organizationID string) error {
	for _, dr := range defaultRoles {
		if _, err := createRole(ctx, q, organizationID, dr.Key, dr.Name, dr.Description, dr.Scope, true, dr.Permissions); err != nil {
			return err
		}
	}
	return nil
}

// CreateRole creates a custom (non-system) role for a organization.
func (s *Store) CreateRole(ctx context.Context, organizationID, key, name, description string, scope models.ScopeType, perms []models.Permission) (models.Role, error) {
	for _, p := range perms {
		if !models.IsValidPermission(p) {
			return models.Role{}, fmt.Errorf("store: unknown permission %q", p)
		}
	}
	if scope != models.ScopeOrganization && scope != models.ScopeProject {
		return models.Role{}, fmt.Errorf("store: invalid role scope %q", scope)
	}
	return createRole(ctx, s.pool, organizationID, key, name, description, scope, false, perms)
}

func createRole(ctx context.Context, q querier, organizationID, key, name, description string, scope models.ScopeType, isSystem bool, perms []models.Permission) (models.Role, error) {
	const q1 = `
		INSERT INTO roles (organization_id, key, name, description, scope, is_system)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + roleColumns
	role, err := scanRole(q.QueryRow(ctx, q1, organizationID, key, name, description, string(scope), isSystem))
	if err != nil {
		return models.Role{}, fmt.Errorf("store: insert role: %w", err)
	}
	for _, p := range perms {
		if _, err := q.Exec(ctx,
			`INSERT INTO role_permissions (role_id, permission) VALUES ($1, $2)`, role.ID, string(p)); err != nil {
			return models.Role{}, fmt.Errorf("store: insert role permission: %w", err)
		}
	}
	role.Permissions = perms
	return role, nil
}

// GetRoleByKey returns a organization's role (with its permissions) by key.
func (s *Store) GetRoleByKey(ctx context.Context, organizationID, key string) (models.Role, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+roleColumns+` FROM roles WHERE organization_id = $1 AND key = $2`, organizationID, key)
	role, err := scanRole(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Role{}, ErrNotFound
	}
	if err != nil {
		return models.Role{}, fmt.Errorf("store: get role: %w", err)
	}
	perms, err := s.loadRolePermissions(ctx, role.ID)
	if err != nil {
		return models.Role{}, err
	}
	role.Permissions = perms
	return role, nil
}

// ListRolesByOrganization returns all roles for a organization, each with its permissions.
func (s *Store) ListRolesByOrganization(ctx context.Context, organizationID string) ([]models.Role, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+roleColumns+` FROM roles WHERE organization_id = $1 ORDER BY key`, organizationID)
	if err != nil {
		return nil, fmt.Errorf("store: list roles: %w", err)
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		role, err := scanRole(rows)
		if err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for i := range roles {
		perms, err := s.loadRolePermissions(ctx, roles[i].ID)
		if err != nil {
			return nil, err
		}
		roles[i].Permissions = perms
	}
	return roles, nil
}

func (s *Store) loadRolePermissions(ctx context.Context, roleID string) ([]models.Permission, error) {
	rows, err := s.pool.Query(ctx, `SELECT permission FROM role_permissions WHERE role_id = $1 ORDER BY permission`, roleID)
	if err != nil {
		return nil, fmt.Errorf("store: load role permissions: %w", err)
	}
	defer rows.Close()
	out := make([]models.Permission, 0)
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		out = append(out, models.Permission(p))
	}
	return out, rows.Err()
}

// AssignOrganizationRole grants a user a organization-scoped role. Idempotent.
func (s *Store) AssignOrganizationRole(ctx context.Context, userID, roleID, organizationID string) (models.RoleAssignment, error) {
	return assignOrganizationRole(ctx, s.pool, userID, roleID, organizationID)
}

func assignOrganizationRole(ctx context.Context, q querier, userID, roleID, organizationID string) (models.RoleAssignment, error) {
	const sql = `
		INSERT INTO role_assignments (user_id, role_id, scope_type, organization_id)
		VALUES ($1, $2, 'organization', $3)
		ON CONFLICT (user_id, role_id, organization_id, project_id) DO UPDATE SET updated_at = now()
		RETURNING ` + roleAssignmentColumns
	return scanRoleAssignment(q.QueryRow(ctx, sql, userID, roleID, organizationID))
}

// AssignProjectRole grants a user a project-scoped role. Idempotent.
func (s *Store) AssignProjectRole(ctx context.Context, userID, roleID, projectID string) (models.RoleAssignment, error) {
	return assignProjectRole(ctx, s.pool, userID, roleID, projectID)
}

func assignProjectRole(ctx context.Context, q querier, userID, roleID, projectID string) (models.RoleAssignment, error) {
	const sql = `
		INSERT INTO role_assignments (user_id, role_id, scope_type, project_id)
		VALUES ($1, $2, 'project', $3)
		ON CONFLICT (user_id, role_id, organization_id, project_id) DO UPDATE SET updated_at = now()
		RETURNING ` + roleAssignmentColumns
	return scanRoleAssignment(q.QueryRow(ctx, sql, userID, roleID, projectID))
}

// ListPermissionGrantsByUser flattens a user's assignments into (scope,
// permission) grants, for building an authorization Subject.
func (s *Store) ListPermissionGrantsByUser(ctx context.Context, userID string) ([]models.PermissionGrant, error) {
	const q = `
		SELECT ra.scope_type, ra.organization_id, ra.project_id, rp.permission
		FROM role_assignments ra
		JOIN role_permissions rp ON rp.role_id = ra.role_id
		WHERE ra.user_id = $1`
	rows, err := s.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("store: list permission grants: %w", err)
	}
	defer rows.Close()

	out := make([]models.PermissionGrant, 0)
	for rows.Next() {
		var (
			scopeType      string
			organizationID *string
			projectID      *string
			perm           string
		)
		if err := rows.Scan(&scopeType, &organizationID, &projectID, &perm); err != nil {
			return nil, err
		}
		g := models.PermissionGrant{ScopeType: models.ScopeType(scopeType), Permission: models.Permission(perm)}
		if organizationID != nil {
			g.OrganizationID = *organizationID
		}
		if projectID != nil {
			g.ProjectID = *projectID
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func scanRole(row pgx.Row) (models.Role, error) {
	var (
		r     models.Role
		scope string
	)
	if err := row.Scan(&r.ID, &r.OrganizationID, &r.Key, &r.Name, &r.Description, &scope, &r.IsSystem, &r.CreatedAt, &r.UpdatedAt); err != nil {
		return models.Role{}, err
	}
	r.Scope = models.ScopeType(scope)
	return r, nil
}

func scanRoleAssignment(row pgx.Row) (models.RoleAssignment, error) {
	var (
		a         models.RoleAssignment
		scopeType string
	)
	if err := row.Scan(&a.ID, &a.UserID, &a.RoleID, &scopeType, &a.OrganizationID, &a.ProjectID, &a.CreatedAt, &a.UpdatedAt); err != nil {
		return models.RoleAssignment{}, err
	}
	a.ScopeType = models.ScopeType(scopeType)
	return a, nil
}
