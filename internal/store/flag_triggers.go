package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const flagTriggerColumns = `id, project_id, environment_id, environment_key, flag_key,
	action, instructions, token, description, enabled, exec_count,
	created_by, created_by_email, created_at, last_executed_at`

// CreateFlagTrigger inserts a trigger and returns it.
func (s *Store) CreateFlagTrigger(ctx context.Context, t models.FlagTrigger) (models.FlagTrigger, error) {
	const q = `
		INSERT INTO flag_triggers
			(project_id, environment_id, environment_key, flag_key, action, instructions, token, description, created_by, created_by_email)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING ` + flagTriggerColumns
	row := s.pool.QueryRow(ctx, q, t.ProjectID, t.EnvironmentID, t.EnvironmentKey, t.FlagKey,
		t.Action, t.Instructions, t.Token, t.Description, t.CreatedBy, t.CreatedByEmail)
	return scanFlagTrigger(row)
}

// ListFlagTriggersByProject lists a project's triggers, newest first. Empty
// flagKey/envKey act as wildcards.
func (s *Store) ListFlagTriggersByProject(ctx context.Context, projectID, flagKey, envKey string) ([]models.FlagTrigger, error) {
	const q = `SELECT ` + flagTriggerColumns + ` FROM flag_triggers
		WHERE project_id = $1
		  AND ($2 = '' OR flag_key = $2)
		  AND ($3 = '' OR environment_key = $3)
		ORDER BY created_at DESC`
	rows, err := s.pool.Query(ctx, q, projectID, flagKey, envKey)
	if err != nil {
		return nil, fmt.Errorf("store: list flag triggers: %w", err)
	}
	defer rows.Close()
	out := make([]models.FlagTrigger, 0)
	for rows.Next() {
		t, err := scanFlagTrigger(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// GetFlagTrigger returns one trigger by id.
func (s *Store) GetFlagTrigger(ctx context.Context, id string) (models.FlagTrigger, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+flagTriggerColumns+` FROM flag_triggers WHERE id = $1`, id)
	return getFlagTrigger(row)
}

// GetFlagTriggerByToken returns the trigger whose URL carries this token.
func (s *Store) GetFlagTriggerByToken(ctx context.Context, token string) (models.FlagTrigger, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+flagTriggerColumns+` FROM flag_triggers WHERE token = $1`, token)
	return getFlagTrigger(row)
}

func getFlagTrigger(row pgx.Row) (models.FlagTrigger, error) {
	t, err := scanFlagTrigger(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.FlagTrigger{}, ErrNotFound
	}
	if err != nil {
		return models.FlagTrigger{}, fmt.Errorf("store: get flag trigger: %w", err)
	}
	return t, nil
}

// SetFlagTriggerEnabled enables or disables a trigger and returns it.
func (s *Store) SetFlagTriggerEnabled(ctx context.Context, id string, enabled bool) (models.FlagTrigger, error) {
	row := s.pool.QueryRow(ctx, `UPDATE flag_triggers SET enabled = $2 WHERE id = $1
		RETURNING `+flagTriggerColumns, id, enabled)
	return getFlagTrigger(row)
}

// ResetFlagTriggerToken swaps in a new token (invalidating the old URL).
func (s *Store) ResetFlagTriggerToken(ctx context.Context, id, token string) (models.FlagTrigger, error) {
	row := s.pool.QueryRow(ctx, `UPDATE flag_triggers SET token = $2 WHERE id = $1
		RETURNING `+flagTriggerColumns, id, token)
	return getFlagTrigger(row)
}

// DeleteFlagTrigger removes a trigger.
func (s *Store) DeleteFlagTrigger(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM flag_triggers WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete flag trigger: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// RecordFlagTriggerExecution bumps the execution count and last-executed time.
func (s *Store) RecordFlagTriggerExecution(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `UPDATE flag_triggers
		SET exec_count = exec_count + 1, last_executed_at = now() WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: record flag trigger execution: %w", err)
	}
	return nil
}

func scanFlagTrigger(row pgx.Row) (models.FlagTrigger, error) {
	var t models.FlagTrigger
	err := row.Scan(&t.ID, &t.ProjectID, &t.EnvironmentID, &t.EnvironmentKey, &t.FlagKey,
		&t.Action, &t.Instructions, &t.Token, &t.Description, &t.Enabled, &t.ExecCount,
		&t.CreatedBy, &t.CreatedByEmail, &t.CreatedAt, &t.LastExecutedAt)
	if err != nil {
		return models.FlagTrigger{}, err
	}
	return t, nil
}
