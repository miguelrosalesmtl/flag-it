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
	const q = `
		INSERT INTO memberships (user_id, tenant_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, tenant_id) DO UPDATE SET updated_at = now()
		RETURNING ` + membershipColumns
	row := s.pool.QueryRow(ctx, q, userID, tenantID)
	return scanMembership(row)
}

// ListMembershipsByUser returns every tenant a user belongs to.
func (s *Store) ListMembershipsByUser(ctx context.Context, userID string) ([]models.Membership, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+membershipColumns+` FROM memberships WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("store: list memberships: %w", err)
	}
	defer rows.Close()

	var out []models.Membership
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
