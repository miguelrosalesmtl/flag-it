package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const environmentColumns = `id, project_id, key, name, created_at, updated_at`

// CreateEnvironment adds an environment to a project and backfills a config row
// for every existing flag (so the new environment starts off for all of them) —
// atomically.
func (s *Store) CreateEnvironment(ctx context.Context, projectID, key, name string) (models.Environment, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return models.Environment{}, fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	const insertEnv = `INSERT INTO environments (project_id, key, name) VALUES ($1, $2, $3) RETURNING ` + environmentColumns
	env, err := scanEnvironment(tx.QueryRow(ctx, insertEnv, projectID, key, name))
	if err != nil {
		return models.Environment{}, fmt.Errorf("store: insert environment: %w", err)
	}
	const backfill = `
		INSERT INTO flag_environments (flag_id, environment_id)
		SELECT id, $1 FROM flags WHERE project_id = $2
		ON CONFLICT (flag_id, environment_id) DO NOTHING`
	if _, err := tx.Exec(ctx, backfill, env.ID, projectID); err != nil {
		return models.Environment{}, fmt.Errorf("store: backfill flag configs: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return models.Environment{}, fmt.Errorf("store: commit: %w", err)
	}
	return env, nil
}

// GetEnvironmentByID looks an environment up by id.
func (s *Store) GetEnvironmentByID(ctx context.Context, id string) (models.Environment, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+environmentColumns+` FROM environments WHERE id = $1`, id)
	e, err := scanEnvironment(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Environment{}, ErrNotFound
	}
	if err != nil {
		return models.Environment{}, fmt.Errorf("store: get environment: %w", err)
	}
	return e, nil
}

// GetEnvironmentByKey looks an environment up by project + key.
func (s *Store) GetEnvironmentByKey(ctx context.Context, projectID, key string) (models.Environment, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+environmentColumns+` FROM environments WHERE project_id = $1 AND key = $2`, projectID, key)
	e, err := scanEnvironment(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Environment{}, ErrNotFound
	}
	if err != nil {
		return models.Environment{}, fmt.Errorf("store: get environment by key: %w", err)
	}
	return e, nil
}

// ListEnvironmentsByProject returns a project's environments ordered by key. A
// non-empty search filters by key or name (case-insensitive).
func (s *Store) ListEnvironmentsByProject(ctx context.Context, projectID, search string) ([]models.Environment, error) {
	const q = `SELECT ` + environmentColumns + ` FROM environments
		WHERE project_id = $1
		  AND ($2 = '' OR key ILIKE '%'||$2||'%' OR name ILIKE '%'||$2||'%')
		ORDER BY key`
	rows, err := s.pool.Query(ctx, q, projectID, search)
	if err != nil {
		return nil, fmt.Errorf("store: list environments: %w", err)
	}
	defer rows.Close()

	out := make([]models.Environment, 0)
	for rows.Next() {
		e, err := scanEnvironment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func scanEnvironment(row pgx.Row) (models.Environment, error) {
	var e models.Environment
	if err := row.Scan(&e.ID, &e.ProjectID, &e.Key, &e.Name, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return models.Environment{}, err
	}
	return e, nil
}
