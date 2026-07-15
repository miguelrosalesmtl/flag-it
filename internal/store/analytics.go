package store

import (
	"context"
	"fmt"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// UpsertEvalStats adds counts into the rolled-up stats table (one row per
// flag/variation/environment/window), summing on conflict.
func (s *Store) UpsertEvalStats(ctx context.Context, stats []models.EvalStat) error {
	const q = `
		INSERT INTO flag_eval_stats (environment_id, flag_key, variation, window_start, count)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (environment_id, flag_key, variation, window_start)
		DO UPDATE SET count = flag_eval_stats.count + EXCLUDED.count`
	for _, st := range stats {
		if _, err := s.pool.Exec(ctx, q, st.EnvironmentID, st.FlagKey, st.Variation, st.WindowStart, st.Count); err != nil {
			return fmt.Errorf("store: upsert eval stats: %w", err)
		}
	}
	return nil
}

// LastEvaluatedByProject returns, per flag key in a project, the most recent
// evaluation window seen across all of the project's environments. Flags with no
// evaluations are absent from the map. Used for stale-flag detection.
func (s *Store) LastEvaluatedByProject(ctx context.Context, projectID string) (map[string]time.Time, error) {
	const q = `
		SELECT s.flag_key, MAX(s.window_start)
		FROM flag_eval_stats s
		JOIN environments e ON e.id = s.environment_id
		WHERE e.project_id = $1
		GROUP BY s.flag_key`
	rows, err := s.pool.Query(ctx, q, projectID)
	if err != nil {
		return nil, fmt.Errorf("store: last evaluated by project: %w", err)
	}
	defer rows.Close()

	out := make(map[string]time.Time)
	for rows.Next() {
		var (
			key  string
			last time.Time
		)
		if err := rows.Scan(&key, &last); err != nil {
			return nil, err
		}
		out[key] = last
	}
	return out, rows.Err()
}

// QueryEvalStats returns per-variation totals for a flag in an environment since
// a given time.
func (s *Store) QueryEvalStats(ctx context.Context, environmentID, flagKey string, since time.Time) ([]models.VariationCount, error) {
	const q = `
		SELECT variation, SUM(count)::bigint
		FROM flag_eval_stats
		WHERE environment_id = $1 AND flag_key = $2 AND window_start >= $3
		GROUP BY variation
		ORDER BY variation`
	rows, err := s.pool.Query(ctx, q, environmentID, flagKey, since)
	if err != nil {
		return nil, fmt.Errorf("store: query eval stats: %w", err)
	}
	defer rows.Close()

	out := make([]models.VariationCount, 0)
	for rows.Next() {
		var vc models.VariationCount
		if err := rows.Scan(&vc.Variation, &vc.Count); err != nil {
			return nil, err
		}
		out = append(out, vc)
	}
	return out, rows.Err()
}

// EnvEvalStats returns each flag's total evaluations in an environment since a
// given time, most-active first — the environment-level analytics rollup.
func (s *Store) EnvEvalStats(ctx context.Context, environmentID string, since time.Time) ([]models.FlagCount, error) {
	const q = `
		SELECT flag_key, SUM(count)::bigint AS total
		FROM flag_eval_stats
		WHERE environment_id = $1 AND window_start >= $2
		GROUP BY flag_key
		ORDER BY total DESC, flag_key`
	rows, err := s.pool.Query(ctx, q, environmentID, since)
	if err != nil {
		return nil, fmt.Errorf("store: env eval stats: %w", err)
	}
	defer rows.Close()

	out := make([]models.FlagCount, 0)
	for rows.Next() {
		var fc models.FlagCount
		if err := rows.Scan(&fc.FlagKey, &fc.Count); err != nil {
			return nil, err
		}
		out = append(out, fc)
	}
	return out, rows.Err()
}
