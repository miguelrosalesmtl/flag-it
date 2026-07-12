package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const tenantColumns = `id, slug, name, created_at, updated_at`

// CreateTenant inserts a tenant and seeds its default system roles
// (tenant_admin, writer, reader) in one transaction.
func (s *Store) CreateTenant(ctx context.Context, slug, name string) (models.Tenant, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.Tenant{}, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	const q = `INSERT INTO tenants (slug, name) VALUES ($1, $2) RETURNING ` + tenantColumns
	tenant, err := scanTenant(tx.QueryRow(ctx, q, slug, name))
	if err != nil {
		return models.Tenant{}, fmt.Errorf("store: insert tenant: %w", err)
	}
	if err := seedDefaultRoles(ctx, tx, tenant.ID); err != nil {
		return models.Tenant{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Tenant{}, fmt.Errorf("store: commit: %w", err)
	}
	return tenant, nil
}

// GetTenantByID looks a tenant up by id.
func (s *Store) GetTenantByID(ctx context.Context, id string) (models.Tenant, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+tenantColumns+` FROM tenants WHERE id = $1`, id)
	t, err := scanTenant(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Tenant{}, ErrNotFound
	}
	if err != nil {
		return models.Tenant{}, fmt.Errorf("store: get tenant: %w", err)
	}
	return t, nil
}

// GetTenantBySlug looks a tenant up by slug.
func (s *Store) GetTenantBySlug(ctx context.Context, slug string) (models.Tenant, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+tenantColumns+` FROM tenants WHERE slug = $1`, slug)
	t, err := scanTenant(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Tenant{}, ErrNotFound
	}
	if err != nil {
		return models.Tenant{}, fmt.Errorf("store: get tenant by slug: %w", err)
	}
	return t, nil
}

// ListTenants returns all tenants ordered by slug (superuser view).
func (s *Store) ListTenants(ctx context.Context) ([]models.Tenant, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+tenantColumns+` FROM tenants ORDER BY slug`)
	if err != nil {
		return nil, fmt.Errorf("store: list tenants: %w", err)
	}
	defer rows.Close()

	var out []models.Tenant
	for rows.Next() {
		t, err := scanTenant(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// UpdateTenant updates a tenant's display name.
func (s *Store) UpdateTenant(ctx context.Context, id, name string) (models.Tenant, error) {
	const q = `UPDATE tenants SET name = $2, updated_at = now() WHERE id = $1 RETURNING ` + tenantColumns
	t, err := scanTenant(s.pool.QueryRow(ctx, q, id, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Tenant{}, ErrNotFound
	}
	if err != nil {
		return models.Tenant{}, fmt.Errorf("store: update tenant: %w", err)
	}
	return t, nil
}

// DeleteTenant removes a tenant; cascades drop its projects, roles, etc.
func (s *Store) DeleteTenant(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM tenants WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete tenant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanTenant(row pgx.Row) (models.Tenant, error) {
	var t models.Tenant
	if err := row.Scan(&t.ID, &t.Slug, &t.Name, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return models.Tenant{}, err
	}
	return t, nil
}
