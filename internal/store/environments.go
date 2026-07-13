package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const environmentColumns = `id, project_id, key, name, created_at, updated_at`

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

// ListEnvironmentsByProject returns a project's environments ordered by key.
func (s *Store) ListEnvironmentsByProject(ctx context.Context, projectID string) ([]models.Environment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+environmentColumns+` FROM environments WHERE project_id = $1 ORDER BY key`, projectID)
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
