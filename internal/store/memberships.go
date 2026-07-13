package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const membershipColumns = `id, user_id, tenant_id, created_at, updated_at`

// CreateMembership records that a user belongs to a tenant (belonging only;
// permissions come from role assignments). Idempotent.
func (s *Store) CreateMembership(ctx context.Context, userID, tenantID string) (models.Membership, error) {
	return insertMembership(ctx, s.pool, userID, tenantID)
}

// insertMembership is the querier-based body of CreateMembership, so it can run
// inside a larger transaction (e.g. AddMember, GrantProjectRole).
func insertMembership(ctx context.Context, q querier, userID, tenantID string) (models.Membership, error) {
	const sql = `
		INSERT INTO memberships (user_id, tenant_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, tenant_id) DO UPDATE SET updated_at = now()
		RETURNING ` + membershipColumns
	return scanMembership(q.QueryRow(ctx, sql, userID, tenantID))
}

// ListMembersByTenant returns a tenant's members with their tenant-scoped role
// (one row per user; the role is the alphabetically-first if several apply).
func (s *Store) ListMembersByTenant(ctx context.Context, tenantID string) ([]models.Member, error) {
	const q = `
		SELECT DISTINCT ON (u.id) u.id, u.email, u.full_name, COALESCE(r.key, '')
		FROM memberships m
		JOIN users u ON u.id = m.user_id
		LEFT JOIN role_assignments ra
			ON ra.user_id = u.id AND ra.tenant_id = $1 AND ra.scope_type = 'tenant'
		LEFT JOIN roles r ON r.id = ra.role_id
		WHERE m.tenant_id = $1
		ORDER BY u.id, r.key`
	rows, err := s.pool.Query(ctx, q, tenantID)
	if err != nil {
		return nil, fmt.Errorf("store: list members: %w", err)
	}
	defer rows.Close()

	out := make([]models.Member, 0)
	for rows.Next() {
		var m models.Member
		if err := rows.Scan(&m.UserID, &m.Email, &m.FullName, &m.Role); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// ListMembershipsByUser returns every tenant a user belongs to.
func (s *Store) ListMembershipsByUser(ctx context.Context, userID string) ([]models.Membership, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+membershipColumns+` FROM memberships WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("store: list memberships: %w", err)
	}
	defer rows.Close()

	out := make([]models.Membership, 0)
	for rows.Next() {
		m, err := scanMembership(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func scanMembership(row pgx.Row) (models.Membership, error) {
	var m models.Membership
	if err := row.Scan(&m.ID, &m.UserID, &m.TenantID, &m.CreatedAt, &m.UpdatedAt); err != nil {
		return models.Membership{}, err
	}
	return m, nil
}
