package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const changeRequestColumns = `id, project_id, environment_id, environment_key, flag_key,
	instructions, comment, status, requested_by, requested_by_email,
	reviewed_by, reviewed_by_email, review_comment, created_at, reviewed_at`

// CreateChangeRequest inserts a pending change request and returns it.
func (s *Store) CreateChangeRequest(ctx context.Context, cr models.ChangeRequest) (models.ChangeRequest, error) {
	const q = `
		INSERT INTO change_requests
			(project_id, environment_id, environment_key, flag_key, instructions, comment, requested_by, requested_by_email)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING ` + changeRequestColumns
	row := s.pool.QueryRow(ctx, q, cr.ProjectID, cr.EnvironmentID, cr.EnvironmentKey, cr.FlagKey,
		cr.Instructions, cr.Comment, cr.RequestedBy, cr.RequestedByEmail)
	return scanChangeRequest(row)
}

// ListChangeRequestsByProject lists a project's change requests, newest first. A
// non-empty status filters (pending / approved / rejected).
func (s *Store) ListChangeRequestsByProject(ctx context.Context, projectID, status string) ([]models.ChangeRequest, error) {
	const q = `SELECT ` + changeRequestColumns + ` FROM change_requests
		WHERE project_id = $1 AND ($2 = '' OR status = $2)
		ORDER BY created_at DESC`
	rows, err := s.pool.Query(ctx, q, projectID, status)
	if err != nil {
		return nil, fmt.Errorf("store: list change requests: %w", err)
	}
	defer rows.Close()
	out := make([]models.ChangeRequest, 0)
	for rows.Next() {
		cr, err := scanChangeRequest(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, cr)
	}
	return out, rows.Err()
}

// GetChangeRequest returns one change request by id.
func (s *Store) GetChangeRequest(ctx context.Context, id string) (models.ChangeRequest, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+changeRequestColumns+` FROM change_requests WHERE id = $1`, id)
	cr, err := scanChangeRequest(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ChangeRequest{}, ErrNotFound
	}
	if err != nil {
		return models.ChangeRequest{}, fmt.Errorf("store: get change request: %w", err)
	}
	return cr, nil
}

// ReviewChangeRequest records a review (status + reviewer + comment + time) and
// returns the updated request.
func (s *Store) ReviewChangeRequest(ctx context.Context, id, status, reviewedBy, reviewedByEmail, reviewComment string) (models.ChangeRequest, error) {
	const q = `
		UPDATE change_requests
		SET status = $2, reviewed_by = $3, reviewed_by_email = $4, review_comment = $5, reviewed_at = now()
		WHERE id = $1
		RETURNING ` + changeRequestColumns
	row := s.pool.QueryRow(ctx, q, id, status, reviewedBy, reviewedByEmail, reviewComment)
	cr, err := scanChangeRequest(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.ChangeRequest{}, ErrNotFound
	}
	if err != nil {
		return models.ChangeRequest{}, fmt.Errorf("store: review change request: %w", err)
	}
	return cr, nil
}

func scanChangeRequest(row pgx.Row) (models.ChangeRequest, error) {
	var cr models.ChangeRequest
	err := row.Scan(&cr.ID, &cr.ProjectID, &cr.EnvironmentID, &cr.EnvironmentKey, &cr.FlagKey,
		&cr.Instructions, &cr.Comment, &cr.Status, &cr.RequestedBy, &cr.RequestedByEmail,
		&cr.ReviewedBy, &cr.ReviewedByEmail, &cr.ReviewComment, &cr.CreatedAt, &cr.ReviewedAt)
	if err != nil {
		return models.ChangeRequest{}, err
	}
	return cr, nil
}
