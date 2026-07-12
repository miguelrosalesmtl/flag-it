package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const sdkKeyColumns = `id, environment_id, key, kind, name, last_used_at, revoked_at, created_at`

// CreateSdkKey issues a new SDK key for an environment.
func (s *Store) CreateSdkKey(ctx context.Context, environmentID, key, kind, name string) (models.SdkKey, error) {
	const q = `
		INSERT INTO sdk_keys (environment_id, key, kind, name)
		VALUES ($1, $2, $3, $4)
		RETURNING ` + sdkKeyColumns
	row := s.pool.QueryRow(ctx, q, environmentID, key, kind, name)
	return scanSdkKey(row)
}

// ListSdkKeysByEnvironment returns an environment's keys (newest first).
func (s *Store) ListSdkKeysByEnvironment(ctx context.Context, environmentID string) ([]models.SdkKey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+sdkKeyColumns+` FROM sdk_keys WHERE environment_id = $1 ORDER BY created_at DESC`, environmentID)
	if err != nil {
		return nil, fmt.Errorf("store: list sdk keys: %w", err)
	}
	defer rows.Close()

	var out []models.SdkKey
	for rows.Next() {
		sk, err := scanSdkKey(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sk)
	}
	return out, rows.Err()
}

// RevokeSdkKey marks a key revoked. It is scoped to an environment so a key can
// only be revoked through its own environment. Returns ErrNotFound if the key
// does not exist there or is already revoked.
func (s *Store) RevokeSdkKey(ctx context.Context, id, environmentID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE sdk_keys SET revoked_at = now() WHERE id = $1 AND environment_id = $2 AND revoked_at IS NULL`,
		id, environmentID)
	if err != nil {
		return fmt.Errorf("store: revoke sdk key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetActiveSdkKey resolves a presented key to its record, ignoring revoked keys.
// This is how an evaluation request identifies its environment.
func (s *Store) GetActiveSdkKey(ctx context.Context, key string) (models.SdkKey, error) {
	const q = `SELECT ` + sdkKeyColumns + ` FROM sdk_keys WHERE key = $1 AND revoked_at IS NULL`
	row := s.pool.QueryRow(ctx, q, key)
	sk, err := scanSdkKey(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.SdkKey{}, ErrNotFound
	}
	if err != nil {
		return models.SdkKey{}, fmt.Errorf("store: get sdk key: %w", err)
	}
	return sk, nil
}

func scanSdkKey(row pgx.Row) (models.SdkKey, error) {
	var sk models.SdkKey
	if err := row.Scan(&sk.ID, &sk.EnvironmentID, &sk.Key, &sk.Kind, &sk.Name,
		&sk.LastUsedAt, &sk.RevokedAt, &sk.CreatedAt); err != nil {
		return models.SdkKey{}, err
	}
	return sk, nil
}
