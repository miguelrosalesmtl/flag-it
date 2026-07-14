package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const organizationColumns = `id, slug, name, created_at, updated_at`

// CreateOrganization inserts a organization and seeds its default system roles
// (organization_admin, writer, reader) in one transaction.
func (s *Store) CreateOrganization(ctx context.Context, slug, name string) (models.Organization, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.Organization{}, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	organization, err := insertOrganizationWithRoles(ctx, tx, slug, name)
	if err != nil {
		return models.Organization{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Organization{}, fmt.Errorf("store: commit: %w", err)
	}
	return organization, nil
}

// insertOrganizationWithRoles inserts a organization and seeds its default system roles
// using the given querier, so it can run standalone or inside a larger
// transaction (e.g. first-run bootstrap).
func insertOrganizationWithRoles(ctx context.Context, q querier, slug, name string) (models.Organization, error) {
	const sql = `INSERT INTO organizations (slug, name) VALUES ($1, $2) RETURNING ` + organizationColumns
	organization, err := scanOrganization(q.QueryRow(ctx, sql, slug, name))
	if err != nil {
		return models.Organization{}, fmt.Errorf("store: insert organization: %w", err)
	}
	if err := seedDefaultRoles(ctx, q, organization.ID); err != nil {
		return models.Organization{}, err
	}
	return organization, nil
}

// GetOrganizationByID looks a organization up by id.
func (s *Store) GetOrganizationByID(ctx context.Context, id string) (models.Organization, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+organizationColumns+` FROM organizations WHERE id = $1`, id)
	t, err := scanOrganization(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Organization{}, ErrNotFound
	}
	if err != nil {
		return models.Organization{}, fmt.Errorf("store: get organization: %w", err)
	}
	return t, nil
}

// GetOrganizationBySlug looks a organization up by slug.
func (s *Store) GetOrganizationBySlug(ctx context.Context, slug string) (models.Organization, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+organizationColumns+` FROM organizations WHERE slug = $1`, slug)
	t, err := scanOrganization(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Organization{}, ErrNotFound
	}
	if err != nil {
		return models.Organization{}, fmt.Errorf("store: get organization by slug: %w", err)
	}
	return t, nil
}

// ListOrganizations returns all organizations ordered by slug (superuser view).
func (s *Store) ListOrganizations(ctx context.Context) ([]models.Organization, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+organizationColumns+` FROM organizations ORDER BY slug`)
	if err != nil {
		return nil, fmt.Errorf("store: list organizations: %w", err)
	}
	defer rows.Close()

	out := make([]models.Organization, 0)
	for rows.Next() {
		t, err := scanOrganization(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// UpdateOrganization updates a organization's display name.
func (s *Store) UpdateOrganization(ctx context.Context, id, name string) (models.Organization, error) {
	const q = `UPDATE organizations SET name = $2, updated_at = now() WHERE id = $1 RETURNING ` + organizationColumns
	t, err := scanOrganization(s.pool.QueryRow(ctx, q, id, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Organization{}, ErrNotFound
	}
	if err != nil {
		return models.Organization{}, fmt.Errorf("store: update organization: %w", err)
	}
	return t, nil
}

// DeleteOrganization removes a organization; cascades drop its projects, roles, etc.
func (s *Store) DeleteOrganization(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete organization: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanOrganization(row pgx.Row) (models.Organization, error) {
	var t models.Organization
	if err := row.Scan(&t.ID, &t.Slug, &t.Name, &t.CreatedAt, &t.UpdatedAt); err != nil {
		return models.Organization{}, err
	}
	return t, nil
}
