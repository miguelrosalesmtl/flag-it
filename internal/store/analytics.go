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
