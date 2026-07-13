package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const scheduledChangeColumns = `id, project_id, environment_id, environment_key, flag_key,
	instructions, comment, scheduled_for, status, error,
	created_by, created_by_email, created_at, applied_at`

// CreateScheduledChange inserts a pending scheduled change and returns it.
func (s *Store) CreateScheduledChange(ctx context.Context, sc models.ScheduledChange) (models.ScheduledChange, error) {
	const q = `
		INSERT INTO scheduled_changes
			(project_id, environment_id, environment_key, flag_key, instructions, comment, scheduled_for, created_by, created_by_email)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING ` + scheduledChangeColumns
	row := s.pool.QueryRow(ctx, q, sc.ProjectID, sc.EnvironmentID, sc.EnvironmentKey, sc.FlagKey,
		sc.Instructions, sc.Comment, sc.ScheduledFor, sc.CreatedBy, sc.CreatedByEmail)
	return scanScheduledChange(row)
}

// ListScheduledChangesByProject lists a project's scheduled changes, soonest
// first. Empty status/flagKey/envKey act as wildcards.
func (s *Store) ListScheduledChangesByProject(ctx context.Context, projectID, status, flagKey, envKey string) ([]models.ScheduledChange, error) {
	const q = `SELECT ` + scheduledChangeColumns + ` FROM scheduled_changes
		WHERE project_id = $1
		  AND ($2 = '' OR status = $2)
		  AND ($3 = '' OR flag_key = $3)
		  AND ($4 = '' OR environment_key = $4)
		ORDER BY scheduled_for ASC`
	rows, err := s.pool.Query(ctx, q, projectID, status, flagKey, envKey)
	if err != nil {
		return nil, fmt.Errorf("store: list scheduled changes: %w", err)
	}
	defer rows.Close()
	out := make([]models.ScheduledChange, 0)
	for rows.Next() {
		sc, err := scanScheduledChange(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

// GetScheduledChange returns one scheduled change by id.
func (s *Store) GetScheduledChange(ctx context.Context, id string) (models.ScheduledChange, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+scheduledChangeColumns+` FROM scheduled_changes WHERE id = $1`, id)
	sc, err := scanScheduledChange(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ScheduledChange{}, ErrNotFound
	}
	if err != nil {
		return models.ScheduledChange{}, fmt.Errorf("store: get scheduled change: %w", err)
	}
	return sc, nil
}

// ListDueScheduledChanges returns pending changes whose time has come, soonest
// first. The scheduler applies them and marks each applied/failed.
func (s *Store) ListDueScheduledChanges(ctx context.Context, now time.Time, limit int) ([]models.ScheduledChange, error) {
	const q = `SELECT ` + scheduledChangeColumns + ` FROM scheduled_changes
		WHERE status = 'pending' AND scheduled_for <= $1
		ORDER BY scheduled_for ASC
		LIMIT $2`
	rows, err := s.pool.Query(ctx, q, now, limit)
	if err != nil {
		return nil, fmt.Errorf("store: list due scheduled changes: %w", err)
	}
	defer rows.Close()
	out := make([]models.ScheduledChange, 0)
	for rows.Next() {
		sc, err := scanScheduledChange(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

// CancelScheduledChange cancels a pending change. It returns ErrNotFound when no
// pending change with that id exists (already applied/cancelled, or missing).
func (s *Store) CancelScheduledChange(ctx context.Context, id string) (models.ScheduledChange, error) {
	const q = `UPDATE scheduled_changes SET status = 'cancelled'
		WHERE id = $1 AND status = 'pending'
		RETURNING ` + scheduledChangeColumns
	row := s.pool.QueryRow(ctx, q, id)
	sc, err := scanScheduledChange(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ScheduledChange{}, ErrNotFound
	}
	if err != nil {
		return models.ScheduledChange{}, fmt.Errorf("store: cancel scheduled change: %w", err)
	}
	return sc, nil
}

// MarkScheduledChangeApplied flips a pending change to applied. The status guard
// makes it a no-op if another worker already handled it.
func (s *Store) MarkScheduledChangeApplied(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE scheduled_changes
		SET status = 'applied', applied_at = now(), error = ''
		WHERE id = $1 AND status = 'pending'`, id)
	if err != nil {
		return fmt.Errorf("store: mark scheduled change applied: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// MarkScheduledChangeFailed records that applying a change failed.
func (s *Store) MarkScheduledChangeFailed(ctx context.Context, id, msg string) error {
	_, err := s.pool.Exec(ctx, `UPDATE scheduled_changes
		SET status = 'failed', applied_at = now(), error = $2
		WHERE id = $1 AND status = 'pending'`, id, msg)
	if err != nil {
		return fmt.Errorf("store: mark scheduled change failed: %w", err)
	}
	return nil
}

func scanScheduledChange(row pgx.Row) (models.ScheduledChange, error) {
	var sc models.ScheduledChange
	err := row.Scan(&sc.ID, &sc.ProjectID, &sc.EnvironmentID, &sc.EnvironmentKey, &sc.FlagKey,
		&sc.Instructions, &sc.Comment, &sc.ScheduledFor, &sc.Status, &sc.Error,
		&sc.CreatedBy, &sc.CreatedByEmail, &sc.CreatedAt, &sc.AppliedAt)
	if err != nil {
		return models.ScheduledChange{}, err
	}
	return sc, nil
}
