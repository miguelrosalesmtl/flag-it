package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const flagColumns = `id, project_id, key, name, description, salt, client_side_available, variations, created_at, updated_at`

// UpsertFlag creates or updates a flag definition (keyed by project + key). The
// salt is set only on insert (it must stay stable across updates for bucketing).
func (s *Store) UpsertFlag(ctx context.Context, projectID, key, name, description, salt string, clientSideAvailable bool, variations []json.RawMessage) (models.Flag, error) {
	raw, err := json.Marshal(variations)
	if err != nil {
		return models.Flag{}, fmt.Errorf("store: marshal variations: %w", err)
	}
	const q = `
		INSERT INTO flags (project_id, key, name, description, salt, client_side_available, variations)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (project_id, key) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			client_side_available = EXCLUDED.client_side_available,
			variations = EXCLUDED.variations,
			updated_at = now()
		RETURNING ` + flagColumns
	row := s.pool.QueryRow(ctx, q, projectID, key, name, description, salt, clientSideAvailable, raw)
	return scanFlag(row)
}

// GetFlagByID looks a flag up by id.
func (s *Store) GetFlagByID(ctx context.Context, id string) (models.Flag, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+flagColumns+` FROM flags WHERE id = $1`, id)
	f, err := scanFlag(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Flag{}, ErrNotFound
	}
	if err != nil {
		return models.Flag{}, fmt.Errorf("store: get flag: %w", err)
	}
	return f, nil
}

// GetFlagByKey looks a flag up by project + key.
func (s *Store) GetFlagByKey(ctx context.Context, projectID, key string) (models.Flag, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+flagColumns+` FROM flags WHERE project_id = $1 AND key = $2`, projectID, key)
	f, err := scanFlag(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Flag{}, ErrNotFound
	}
	if err != nil {
		return models.Flag{}, fmt.Errorf("store: get flag by key: %w", err)
	}
	return f, nil
}

// ListFlagsByProject returns a project's flag definitions ordered by key.
func (s *Store) ListFlagsByProject(ctx context.Context, projectID string) ([]models.Flag, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT `+flagColumns+` FROM flags WHERE project_id = $1 ORDER BY key`, projectID)
	if err != nil {
		return nil, fmt.Errorf("store: list flags: %w", err)
	}
	defer rows.Close()

	out := make([]models.Flag, 0)
	for rows.Next() {
		f, err := scanFlag(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

// DeleteFlag removes a flag; its per-environment configs cascade away.
func (s *Store) DeleteFlag(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM flags WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete flag: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// EnsureFlagConfigs creates a default (off, empty targeting) config row for the
// flag in each of the given environments if one does not already exist.
func (s *Store) EnsureFlagConfigs(ctx context.Context, flagID string, environmentIDs []string) error {
	const q = `
		INSERT INTO flag_environments (flag_id, environment_id)
		VALUES ($1, $2)
		ON CONFLICT (flag_id, environment_id) DO NOTHING`
	for _, envID := range environmentIDs {
		if _, err := s.pool.Exec(ctx, q, flagID, envID); err != nil {
			return fmt.Errorf("store: ensure flag config: %w", err)
		}
	}
	return nil
}

const flagConfigColumns = `id, flag_id, environment_id, enabled, off_variation, prerequisites, targets, rules, fallthrough, version, created_at, updated_at`

// UpsertFlagConfig writes a flag's targeting config for one environment, bumping
// version.
func (s *Store) UpsertFlagConfig(ctx context.Context, cfg models.FlagConfig) (models.FlagConfig, error) {
	prerequisites, err := json.Marshal(orEmpty(cfg.Prerequisites))
	if err != nil {
		return models.FlagConfig{}, fmt.Errorf("store: marshal prerequisites: %w", err)
	}
	targets, err := json.Marshal(orEmpty(cfg.Targets))
	if err != nil {
		return models.FlagConfig{}, fmt.Errorf("store: marshal targets: %w", err)
	}
	rules, err := json.Marshal(orEmpty(cfg.Rules))
	if err != nil {
		return models.FlagConfig{}, fmt.Errorf("store: marshal rules: %w", err)
	}
	fallthrough_, err := json.Marshal(cfg.Fallthrough)
	if err != nil {
		return models.FlagConfig{}, fmt.Errorf("store: marshal fallthrough: %w", err)
	}
	const q = `
		INSERT INTO flag_environments
			(flag_id, environment_id, enabled, off_variation, prerequisites, targets, rules, fallthrough, version)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
		ON CONFLICT (flag_id, environment_id) DO UPDATE SET
			enabled = EXCLUDED.enabled,
			off_variation = EXCLUDED.off_variation,
			prerequisites = EXCLUDED.prerequisites,
			targets = EXCLUDED.targets,
			rules = EXCLUDED.rules,
			fallthrough = EXCLUDED.fallthrough,
			version = flag_environments.version + 1,
			updated_at = now()
		RETURNING ` + flagConfigColumns
	row := s.pool.QueryRow(ctx, q,
		cfg.FlagID, cfg.EnvironmentID, cfg.On, cfg.OffVariation, prerequisites, targets, rules, fallthrough_)
	return scanFlagConfig(row)
}

// GetFlagConfig returns a flag's config for one environment.
// FlagOnStatesByEnvironment returns, for every flag in a project, whether it is
// on in the given environment (keyed by flag id). One query for the whole list.
func (s *Store) FlagOnStatesByEnvironment(ctx context.Context, projectID, environmentID string) (map[string]bool, error) {
	const q = `
		SELECT fe.flag_id, fe.enabled
		FROM flag_environments fe
		JOIN flags f ON f.id = fe.flag_id
		WHERE f.project_id = $1 AND fe.environment_id = $2`
	rows, err := s.pool.Query(ctx, q, projectID, environmentID)
	if err != nil {
		return nil, fmt.Errorf("store: flag on-states: %w", err)
	}
	defer rows.Close()
	out := make(map[string]bool)
	for rows.Next() {
		var id string
		var on bool
		if err := rows.Scan(&id, &on); err != nil {
			return nil, err
		}
		out[id] = on
	}
	return out, rows.Err()
}

func (s *Store) GetFlagConfig(ctx context.Context, flagID, environmentID string) (models.FlagConfig, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+flagConfigColumns+` FROM flag_environments WHERE flag_id = $1 AND environment_id = $2`,
		flagID, environmentID)
	c, err := scanFlagConfig(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.FlagConfig{}, ErrNotFound
	}
	if err != nil {
		return models.FlagConfig{}, fmt.Errorf("store: get flag config: %w", err)
	}
	return c, nil
}

// ListEvalFlags returns every evaluable flag across all environments, for
// warming a replica's cache at startup.
func (s *Store) ListEvalFlags(ctx context.Context) ([]models.EvalFlag, error) {
	return s.queryEvalFlags(ctx, evalFlagQuery)
}

// ListEvalFlagsByEnvironment returns the evaluable flags for one environment.
func (s *Store) ListEvalFlagsByEnvironment(ctx context.Context, environmentID string) ([]models.EvalFlag, error) {
	return s.queryEvalFlags(ctx, evalFlagQuery+` WHERE fe.environment_id = $1`, environmentID)
}

const evalFlagQuery = `
	SELECT fe.environment_id, f.key, f.salt, f.client_side_available, f.variations, fe.enabled,
	       fe.off_variation, fe.prerequisites, fe.targets, fe.rules, fe.fallthrough, fe.version
	FROM flag_environments fe
	JOIN flags f ON f.id = fe.flag_id`

func (s *Store) queryEvalFlags(ctx context.Context, q string, args ...any) ([]models.EvalFlag, error) {
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("store: query eval flags: %w", err)
	}
	defer rows.Close()

	out := make([]models.EvalFlag, 0)
	for rows.Next() {
		var (
			ef            models.EvalFlag
			variations    []byte
			prerequisites []byte
			targets       []byte
			rules         []byte
			fallthrough_  []byte
		)
		if err := rows.Scan(&ef.EnvironmentID, &ef.Key, &ef.Salt, &ef.ClientSideAvailable, &variations, &ef.On,
			&ef.OffVariation, &prerequisites, &targets, &rules, &fallthrough_, &ef.Version); err != nil {
			return nil, err
		}
		if err := unmarshalAll(map[string]struct {
			data []byte
			dst  any
		}{
			"variations":    {variations, &ef.Variations},
			"prerequisites": {prerequisites, &ef.Prerequisites},
			"targets":       {targets, &ef.Targets},
			"rules":         {rules, &ef.Rules},
			"fallthrough":   {fallthrough_, &ef.Fallthrough},
		}); err != nil {
			return nil, err
		}
		out = append(out, ef)
	}
	return out, rows.Err()
}

func scanFlag(row pgx.Row) (models.Flag, error) {
	var (
		f          models.Flag
		variations []byte
	)
	if err := row.Scan(&f.ID, &f.ProjectID, &f.Key, &f.Name, &f.Description,
		&f.Salt, &f.ClientSideAvailable, &variations, &f.CreatedAt, &f.UpdatedAt); err != nil {
		return models.Flag{}, err
	}
	if err := json.Unmarshal(variations, &f.Variations); err != nil {
		return models.Flag{}, fmt.Errorf("store: unmarshal variations: %w", err)
	}
	return f, nil
}

func scanFlagConfig(row pgx.Row) (models.FlagConfig, error) {
	var (
		c             models.FlagConfig
		prerequisites []byte
		targets       []byte
		rules         []byte
		fallthrough_  []byte
	)
	if err := row.Scan(&c.ID, &c.FlagID, &c.EnvironmentID, &c.On, &c.OffVariation,
		&prerequisites, &targets, &rules, &fallthrough_, &c.Version, &c.CreatedAt, &c.UpdatedAt); err != nil {
		return models.FlagConfig{}, err
	}
	if err := unmarshalAll(map[string]struct {
		data []byte
		dst  any
	}{
		"prerequisites": {prerequisites, &c.Prerequisites},
		"targets":       {targets, &c.Targets},
		"rules":         {rules, &c.Rules},
		"fallthrough":   {fallthrough_, &c.Fallthrough},
	}); err != nil {
		return models.FlagConfig{}, err
	}
	return c, nil
}

func unmarshalAll(fields map[string]struct {
	data []byte
	dst  any
}) error {
	for name, f := range fields {
		if err := json.Unmarshal(f.data, f.dst); err != nil {
			return fmt.Errorf("store: unmarshal %s: %w", name, err)
		}
	}
	return nil
}

func orEmpty[T any](s []T) []T {
	if s == nil {
		return []T{}
	}
	return s
}
