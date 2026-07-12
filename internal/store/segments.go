package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const segmentColumns = `id, project_id, key, name, description, salt,
	included, excluded, included_contexts, excluded_contexts, rules, version, created_at, updated_at`

// EvalSegment pairs a segment with an environment it applies to (for cache
// warming, where a project's segments apply to all its environments).
type EvalSegment struct {
	EnvironmentID string
	Segment       models.Segment
}

// UpsertSegment creates or updates a segment (keyed by project + key). Salt is
// set only on insert (stable across updates for weighted-membership bucketing).
func (s *Store) UpsertSegment(ctx context.Context, seg models.Segment) (models.Segment, error) {
	included, _ := json.Marshal(orEmpty(seg.Included))
	excluded, _ := json.Marshal(orEmpty(seg.Excluded))
	incCtx, _ := json.Marshal(orEmpty(seg.IncludedContexts))
	excCtx, _ := json.Marshal(orEmpty(seg.ExcludedContexts))
	rules, _ := json.Marshal(orEmpty(seg.Rules))

	const q = `
		INSERT INTO segments
			(project_id, key, name, description, salt, included, excluded, included_contexts, excluded_contexts, rules)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (project_id, key) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			included = EXCLUDED.included,
			excluded = EXCLUDED.excluded,
			included_contexts = EXCLUDED.included_contexts,
			excluded_contexts = EXCLUDED.excluded_contexts,
			rules = EXCLUDED.rules,
			version = segments.version + 1,
			updated_at = now()
		RETURNING ` + segmentColumns
	row := s.pool.QueryRow(ctx, q,
		seg.ProjectID, seg.Key, seg.Name, seg.Description, seg.Salt,
		included, excluded, incCtx, excCtx, rules)
	return scanSegment(row)
}

// GetSegmentByKey looks a segment up by project + key.
func (s *Store) GetSegmentByKey(ctx context.Context, projectID, key string) (models.Segment, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+segmentColumns+` FROM segments WHERE project_id = $1 AND key = $2`, projectID, key)
	seg, err := scanSegment(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Segment{}, ErrNotFound
	}
	if err != nil {
		return models.Segment{}, fmt.Errorf("store: get segment: %w", err)
	}
	return seg, nil
}

// ListSegmentsByProject returns a project's segments ordered by key.
func (s *Store) ListSegmentsByProject(ctx context.Context, projectID string) ([]models.Segment, error) {
	rows, err := s.pool.Query(ctx, `SELECT `+segmentColumns+` FROM segments WHERE project_id = $1 ORDER BY key`, projectID)
	if err != nil {
		return nil, fmt.Errorf("store: list segments: %w", err)
	}
	defer rows.Close()
	var out []models.Segment
	for rows.Next() {
		seg, err := scanSegment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, seg)
	}
	return out, rows.Err()
}

// DeleteSegment removes a segment by project + key.
func (s *Store) DeleteSegment(ctx context.Context, projectID, key string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM segments WHERE project_id = $1 AND key = $2`, projectID, key)
	if err != nil {
		return fmt.Errorf("store: delete segment: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

const evalSegmentQuery = `
	SELECT e.id, s.key, s.salt, s.included, s.excluded, s.included_contexts, s.excluded_contexts, s.rules
	FROM segments s
	JOIN environments e ON e.project_id = s.project_id`

// ListEvalSegments returns every segment paired with each environment it applies
// to, for warming the cache.
func (s *Store) ListEvalSegments(ctx context.Context) ([]EvalSegment, error) {
	return s.queryEvalSegments(ctx, evalSegmentQuery)
}

// ListEvalSegmentsByEnvironment returns the segments applicable to one
// environment (its project's segments).
func (s *Store) ListEvalSegmentsByEnvironment(ctx context.Context, environmentID string) ([]models.Segment, error) {
	rows, err := s.queryEvalSegments(ctx, evalSegmentQuery+` WHERE e.id = $1`, environmentID)
	if err != nil {
		return nil, err
	}
	out := make([]models.Segment, len(rows))
	for i, r := range rows {
		out[i] = r.Segment
	}
	return out, nil
}

func (s *Store) queryEvalSegments(ctx context.Context, q string, args ...any) ([]EvalSegment, error) {
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("store: query eval segments: %w", err)
	}
	defer rows.Close()

	var out []EvalSegment
	for rows.Next() {
		var (
			envID    string
			seg      models.Segment
			included []byte
			excluded []byte
			incCtx   []byte
			excCtx   []byte
			rules    []byte
		)
		if err := rows.Scan(&envID, &seg.Key, &seg.Salt, &included, &excluded, &incCtx, &excCtx, &rules); err != nil {
			return nil, err
		}
		if err := unmarshalAll(map[string]struct {
			data []byte
			dst  any
		}{
			"included":          {included, &seg.Included},
			"excluded":          {excluded, &seg.Excluded},
			"included_contexts": {incCtx, &seg.IncludedContexts},
			"excluded_contexts": {excCtx, &seg.ExcludedContexts},
			"rules":             {rules, &seg.Rules},
		}); err != nil {
			return nil, err
		}
		out = append(out, EvalSegment{EnvironmentID: envID, Segment: seg})
	}
	return out, rows.Err()
}

func scanSegment(row pgx.Row) (models.Segment, error) {
	var (
		seg      models.Segment
		included []byte
		excluded []byte
		incCtx   []byte
		excCtx   []byte
		rules    []byte
	)
	if err := row.Scan(&seg.ID, &seg.ProjectID, &seg.Key, &seg.Name, &seg.Description, &seg.Salt,
		&included, &excluded, &incCtx, &excCtx, &rules, &seg.Version, &seg.CreatedAt, &seg.UpdatedAt); err != nil {
		return models.Segment{}, err
	}
	if err := unmarshalAll(map[string]struct {
		data []byte
		dst  any
	}{
		"included":          {included, &seg.Included},
		"excluded":          {excluded, &seg.Excluded},
		"included_contexts": {incCtx, &seg.IncludedContexts},
		"excluded_contexts": {excCtx, &seg.ExcludedContexts},
		"rules":             {rules, &seg.Rules},
	}); err != nil {
		return models.Segment{}, err
	}
	return seg, nil
}
