package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const projectColumns = `id, tenant_id, key, name, created_at, updated_at`

// defaultEnvironments are seeded for every new project, matching LaunchDarkly's
// behavior of provisioning starter environments.
var defaultEnvironments = []struct{ Key, Name string }{
	{"production", "Production"},
	{"staging", "Staging"},
}

// CreateProject inserts a project and its default environments in one
// transaction, returning both.
func (s *Store) CreateProject(ctx context.Context, tenantID, key, name string) (models.Project, []models.Environment, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.Project{}, nil, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	const insertProject = `
		INSERT INTO projects (tenant_id, key, name)
		VALUES ($1, $2, $3)
		RETURNING ` + projectColumns
	project, err := scanProject(tx.QueryRow(ctx, insertProject, tenantID, key, name))
	if err != nil {
		return models.Project{}, nil, fmt.Errorf("store: insert project: %w", err)
	}

	envs := make([]models.Environment, 0, len(defaultEnvironments))
	for _, de := range defaultEnvironments {
		const insertEnv = `
			INSERT INTO environments (project_id, key, name)
			VALUES ($1, $2, $3)
			RETURNING ` + environmentColumns
		env, err := scanEnvironment(tx.QueryRow(ctx, insertEnv, project.ID, de.Key, de.Name))
		if err != nil {
			return models.Project{}, nil, fmt.Errorf("store: insert environment %q: %w", de.Key, err)
		}
		envs = append(envs, env)
	}

	if err := tx.Commit(ctx); err != nil {
		return models.Project{}, nil, fmt.Errorf("store: commit: %w", err)
	}
	return project, envs, nil
}

// GetProjectByID looks a project up by id.
func (s *Store) GetProjectByID(ctx context.Context, id string) (models.Project, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+projectColumns+` FROM projects WHERE id = $1`, id)
	p, err := scanProject(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Project{}, ErrNotFound
	}
	if err != nil {
		return models.Project{}, fmt.Errorf("store: get project: %w", err)
	}
	return p, nil
}

// GetProjectByKey looks a project up by tenant + key.
func (s *Store) GetProjectByKey(ctx context.Context, tenantID, key string) (models.Project, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+projectColumns+` FROM projects WHERE tenant_id = $1 AND key = $2`, tenantID, key)
	p, err := scanProject(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Project{}, ErrNotFound
	}
	if err != nil {
		return models.Project{}, fmt.Errorf("store: get project by key: %w", err)
	}
	return p, nil
}

// ListProjectsByTenant returns a tenant's projects ordered by key.
func (s *Store) ListProjectsByTenant(ctx context.Context, tenantID string) ([]models.Project, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+projectColumns+` FROM projects WHERE tenant_id = $1 ORDER BY key`, tenantID)
	if err != nil {
		return nil, fmt.Errorf("store: list projects: %w", err)
	}
	defer rows.Close()

	out := make([]models.Project, 0)
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// UpdateProject updates a project's display name.
func (s *Store) UpdateProject(ctx context.Context, id, name string) (models.Project, error) {
	const q = `UPDATE projects SET name = $2, updated_at = now() WHERE id = $1 RETURNING ` + projectColumns
	p, err := scanProject(s.pool.QueryRow(ctx, q, id, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Project{}, ErrNotFound
	}
	if err != nil {
		return models.Project{}, fmt.Errorf("store: update project: %w", err)
	}
	return p, nil
}

// DeleteProject removes a project; cascades drop its environments, flags, etc.
func (s *Store) DeleteProject(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete project: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanProject(row pgx.Row) (models.Project, error) {
	var p models.Project
	if err := row.Scan(&p.ID, &p.TenantID, &p.Key, &p.Name, &p.CreatedAt, &p.UpdatedAt); err != nil {
		return models.Project{}, err
	}
	return p, nil
}
