package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const contextColumns = `id, environment_id, kind, key, attributes, first_seen, last_seen`

// ContextRecord is one seen context to upsert (attributes already JSON-encoded).
type ContextRecord struct {
	Kind       string
	Key        string
	Attributes []byte
}

// UpsertContexts records a batch of seen contexts for an environment, refreshing
// attributes and last_seen on conflict. Called by the periodic recorder flush.
func (s *Store) UpsertContexts(ctx context.Context, environmentID string, recs []ContextRecord) error {
	if len(recs) == 0 {
		return nil
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("store: begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after commit

	const q = `
		INSERT INTO contexts (environment_id, kind, key, attributes)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (environment_id, kind, key)
		DO UPDATE SET attributes = EXCLUDED.attributes, last_seen = now()`
	for _, r := range recs {
		if _, err := tx.Exec(ctx, q, environmentID, r.Kind, r.Key, r.Attributes); err != nil {
			return fmt.Errorf("store: upsert context: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("store: commit: %w", err)
	}
	return nil
}

// ListContexts returns an environment's seen contexts, most-recent first. A
// non-empty search filters by kind or key (case-insensitive).
func (s *Store) ListContexts(ctx context.Context, environmentID, search string, limit int) ([]models.SeenContext, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	const q = `SELECT ` + contextColumns + ` FROM contexts
		WHERE environment_id = $1
		  AND ($2 = '' OR kind ILIKE '%'||$2||'%' OR key ILIKE '%'||$2||'%')
		ORDER BY last_seen DESC
		LIMIT $3`
	rows, err := s.pool.Query(ctx, q, environmentID, search, limit)
	if err != nil {
		return nil, fmt.Errorf("store: list contexts: %w", err)
	}
	defer rows.Close()

	out := make([]models.SeenContext, 0)
	for rows.Next() {
		c, err := scanSeenContext(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// GetContext returns one seen context by kind + key within an environment.
func (s *Store) GetContext(ctx context.Context, environmentID, kind, key string) (models.SeenContext, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+contextColumns+` FROM contexts WHERE environment_id = $1 AND kind = $2 AND key = $3`,
		environmentID, kind, key)
	c, err := scanSeenContext(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.SeenContext{}, ErrNotFound
	}
	if err != nil {
		return models.SeenContext{}, fmt.Errorf("store: get context: %w", err)
	}
	return c, nil
}

func scanSeenContext(row pgx.Row) (models.SeenContext, error) {
	var c models.SeenContext
	if err := row.Scan(&c.ID, &c.EnvironmentID, &c.Kind, &c.Key, &c.Attributes, &c.FirstSeen, &c.LastSeen); err != nil {
		return models.SeenContext{}, err
	}
	return c, nil
}
