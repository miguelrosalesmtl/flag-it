package flags

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/pubsub"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// Service evaluates flags from an in-memory cache and keeps that cache
// consistent across replicas. The cache is keyed by environment id, then flag
// key. Reads are served entirely from memory; writes go to Postgres, reload the
// affected environments locally, and broadcast so sibling replicas reload too.
type Service struct {
	store *store.Store
	bus   *pubsub.Bus
	log   *slog.Logger

	mu    sync.RWMutex
	cache map[string]EvalEnv // envID -> flags + segments

	// In-process subscribers notified when an environment's cache reloads, used
	// by SSE streams to re-push evaluated values.
	submu     sync.Mutex
	subs      map[string]map[int]chan struct{} // envID -> subID -> signal
	nextSubID int
}

// NewService wires the evaluation core to the store and bus.
func NewService(st *store.Store, bus *pubsub.Bus, log *slog.Logger) *Service {
	return &Service{
		store: st,
		bus:   bus,
		log:   log,
		cache: make(map[string]EvalEnv),
		subs:  make(map[string]map[int]chan struct{}),
	}
}

// SubscribeEnv returns a channel that receives a signal whenever the given
// environment's cache reloads (local write or remote pub/sub), plus a cancel
// func. Used by SSE streams; the channel is buffered/coalescing.
func (s *Service) SubscribeEnv(environmentID string) (<-chan struct{}, func()) {
	s.submu.Lock()
	defer s.submu.Unlock()
	id := s.nextSubID
	s.nextSubID++
	ch := make(chan struct{}, 1)
	if s.subs[environmentID] == nil {
		s.subs[environmentID] = make(map[int]chan struct{})
	}
	s.subs[environmentID][id] = ch
	cancel := func() {
		s.submu.Lock()
		defer s.submu.Unlock()
		delete(s.subs[environmentID], id)
		if len(s.subs[environmentID]) == 0 {
			delete(s.subs, environmentID)
		}
	}
	return ch, cancel
}

// notifyEnv wakes all subscribers of an environment (non-blocking, coalescing).
func (s *Service) notifyEnv(environmentID string) {
	s.submu.Lock()
	defer s.submu.Unlock()
	for _, ch := range s.subs[environmentID] {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

// Start warms the cache from Postgres, then blocks consuming change events until
// ctx is cancelled. Run it in its own goroutine.
func (s *Service) Start(ctx context.Context) error {
	if err := s.warm(ctx); err != nil {
		return err
	}
	return s.bus.Subscribe(ctx, s.onEvent)
}

// warm loads every evaluable flag and segment across all environments.
func (s *Service) warm(ctx context.Context) error {
	allFlags, err := s.store.ListEvalFlags(ctx)
	if err != nil {
		return err
	}
	allSegments, err := s.store.ListEvalSegments(ctx)
	if err != nil {
		return err
	}

	next := make(map[string]EvalEnv)
	envFor := func(id string) EvalEnv {
		ed, ok := next[id]
		if !ok {
			ed = EvalEnv{Flags: map[string]models.EvalFlag{}, Segments: map[string]models.Segment{}}
			next[id] = ed
		}
		return ed
	}
	for _, ef := range allFlags {
		envFor(ef.EnvironmentID).Flags[ef.Key] = ef
	}
	for _, es := range allSegments {
		envFor(es.EnvironmentID).Segments[es.Segment.Key] = es.Segment
	}

	s.mu.Lock()
	s.cache = next
	s.mu.Unlock()
	s.log.Info("flag cache warmed",
		slog.Int("environments", len(next)), slog.Int("flag_configs", len(allFlags)), slog.Int("segments", len(allSegments)))
	return nil
}

// reloadEnv rebuilds one environment's flags and segments from Postgres.
func (s *Service) reloadEnv(ctx context.Context, environmentID string) error {
	flagsForEnv, err := s.store.ListEvalFlagsByEnvironment(ctx, environmentID)
	if err != nil {
		return err
	}
	segsForEnv, err := s.store.ListEvalSegmentsByEnvironment(ctx, environmentID)
	if err != nil {
		return err
	}
	ed := EvalEnv{
		Flags:    make(map[string]models.EvalFlag, len(flagsForEnv)),
		Segments: make(map[string]models.Segment, len(segsForEnv)),
	}
	for _, ef := range flagsForEnv {
		ed.Flags[ef.Key] = ef
	}
	for _, seg := range segsForEnv {
		ed.Segments[seg.Key] = seg
	}

	s.mu.Lock()
	s.cache[environmentID] = ed
	s.mu.Unlock()
	s.notifyEnv(environmentID) // wake SSE streams for this environment
	s.log.Debug("environment cache reloaded",
		slog.String("environment_id", environmentID),
		slog.Int("flags", len(ed.Flags)), slog.Int("segments", len(ed.Segments)))
	return nil
}

// onEvent reconciles the local cache with a broadcast from any replica. Events
// this replica published itself are skipped — the write path already reloaded
// the cache (and notified streams) locally.
func (s *Service) onEvent(ctx context.Context, evt pubsub.Event) {
	if evt.OriginInstance == s.bus.InstanceID() {
		return
	}
	switch evt.Type {
	case pubsub.EventEnvironmentChanged:
		if err := s.reloadEnv(ctx, evt.EnvironmentID); err != nil {
			s.log.Warn("cache: reload failed",
				slog.String("environment_id", evt.EnvironmentID), slog.String("error", err.Error()))
		}
	case pubsub.EventEnvironmentRemoved:
		s.mu.Lock()
		delete(s.cache, evt.EnvironmentID)
		s.mu.Unlock()
	}
}

// Evaluate resolves a flag value for a context in the given environment, reading
// only from the in-memory cache.
func (s *Service) Evaluate(environmentID, key string, ctx models.Context, clientOnly bool) (Evaluation, error) {
	s.mu.RLock()
	ed := s.cache[environmentID]
	ef, ok := ed.Flags[key]
	s.mu.RUnlock()
	if !ok || (clientOnly && !ef.ClientSideAvailable) {
		return Evaluation{}, ErrNotFound
	}
	return EvaluateFlag(ef, ctx, ed), nil
}

// EvaluateAll resolves every flag in an environment for a context — the batch
// path used by clients to avoid a round-trip per flag. When clientOnly is set,
// only client-side-available flags are included.
func (s *Service) EvaluateAll(environmentID string, ctx models.Context, clientOnly bool) map[string]Evaluation {
	s.mu.RLock()
	ed := s.cache[environmentID]
	snapshot := make([]models.EvalFlag, 0, len(ed.Flags))
	for _, ef := range ed.Flags {
		snapshot = append(snapshot, ef)
	}
	s.mu.RUnlock()

	out := make(map[string]Evaluation, len(snapshot))
	for _, ef := range snapshot {
		if clientOnly && !ef.ClientSideAvailable {
			continue
		}
		out[ef.Key] = EvaluateFlag(ef, ctx, ed)
	}
	return out
}

// ListFlags returns a project's flag definitions.
func (s *Service) ListFlags(ctx context.Context, projectID string) ([]models.Flag, error) {
	return s.store.ListFlagsByProject(ctx, projectID)
}

// GetFlag returns a single flag definition by key within a project.
func (s *Service) GetFlag(ctx context.Context, projectID, key string) (models.Flag, error) {
	return s.store.GetFlagByKey(ctx, projectID, key)
}

// GetFlagConfig returns a flag's configuration in one environment (on/off,
// targeting, fallthrough).
func (s *Service) GetFlagConfig(ctx context.Context, flagID, environmentID string) (models.FlagConfig, error) {
	return s.store.GetFlagConfig(ctx, flagID, environmentID)
}

// FlagOnStates returns each flag's on/off state in an environment, keyed by flag
// id — for rendering a per-environment flag list in one query.
func (s *Service) FlagOnStates(ctx context.Context, projectID, environmentID string) (map[string]bool, error) {
	return s.store.FlagOnStatesByEnvironment(ctx, projectID, environmentID)
}

// SaveFlag creates or updates a flag definition and ensures it has a config row
// in every environment of its project. Affected environments are reloaded
// locally and broadcast to siblings.
func (s *Service) SaveFlag(ctx context.Context, projectID, key, name, description string, clientSideAvailable bool, variations []json.RawMessage) (models.Flag, error) {
	if err := validateDefinition(key, variations); err != nil {
		return models.Flag{}, err
	}

	// Salt is only applied on insert (UpsertFlag preserves it on update).
	flag, err := s.store.UpsertFlag(ctx, projectID, key, name, description, newSalt(), clientSideAvailable, variations)
	if err != nil {
		return models.Flag{}, err
	}

	envs, err := s.store.ListEnvironmentsByProject(ctx, projectID)
	if err != nil {
		return models.Flag{}, err
	}
	envIDs := environmentIDs(envs)
	if err := s.store.EnsureFlagConfigs(ctx, flag.ID, envIDs); err != nil {
		return models.Flag{}, err
	}

	s.propagate(ctx, envIDs)
	return flag, nil
}

// SaveFlagConfig writes a flag's per-environment config after validating it
// against the flag's variations, then reloads and broadcasts that environment.
func (s *Service) SaveFlagConfig(ctx context.Context, flagID, environmentID string, cfg models.FlagConfig) (models.FlagConfig, error) {
	flag, err := s.store.GetFlagByID(ctx, flagID)
	if err != nil {
		return models.FlagConfig{}, err
	}
	if err := validateConfig(cfg, len(flag.Variations)); err != nil {
		return models.FlagConfig{}, err
	}

	cfg.FlagID = flagID
	cfg.EnvironmentID = environmentID
	saved, err := s.store.UpsertFlagConfig(ctx, cfg)
	if err != nil {
		return models.FlagConfig{}, err
	}

	s.propagate(ctx, []string{environmentID})
	return saved, nil
}

// PatchFlagConfig loads the current per-environment config, applies semantic
// instructions to it, and saves the result (validated + propagated).
func (s *Service) PatchFlagConfig(ctx context.Context, flagID, environmentID string, instructions []Instruction) (models.FlagConfig, error) {
	current, err := s.store.GetFlagConfig(ctx, flagID, environmentID)
	if err != nil {
		return models.FlagConfig{}, err
	}
	next, err := ApplyInstructions(current, instructions)
	if err != nil {
		return models.FlagConfig{}, err
	}
	return s.SaveFlagConfig(ctx, flagID, environmentID, next)
}

// DeleteFlag removes a flag and reloads/broadcasts every environment of its
// project so the flag disappears from all caches.
func (s *Service) DeleteFlag(ctx context.Context, flagID string) error {
	flag, err := s.store.GetFlagByID(ctx, flagID)
	if err != nil {
		return err
	}
	envs, err := s.store.ListEnvironmentsByProject(ctx, flag.ProjectID)
	if err != nil {
		return err
	}
	if err := s.store.DeleteFlag(ctx, flagID); err != nil {
		return err
	}
	s.propagate(ctx, environmentIDs(envs))
	return nil
}

// ListSegments returns a project's segments.
func (s *Service) ListSegments(ctx context.Context, projectID string) ([]models.Segment, error) {
	return s.store.ListSegmentsByProject(ctx, projectID)
}

// SaveSegment creates or updates a segment, then reloads/broadcasts every
// environment of its project (segments affect flag evaluation project-wide).
func (s *Service) SaveSegment(ctx context.Context, seg models.Segment) (models.Segment, error) {
	if seg.Key == "" {
		return models.Segment{}, invalid("segment key is required")
	}
	seg.Salt = newSalt() // applied only on insert (UpsertSegment preserves it)
	saved, err := s.store.UpsertSegment(ctx, seg)
	if err != nil {
		return models.Segment{}, err
	}
	if err := s.propagateProject(ctx, seg.ProjectID); err != nil {
		return models.Segment{}, err
	}
	return saved, nil
}

// DeleteSegment removes a segment and reloads/broadcasts its project's envs.
func (s *Service) DeleteSegment(ctx context.Context, projectID, key string) error {
	if err := s.store.DeleteSegment(ctx, projectID, key); err != nil {
		return err
	}
	return s.propagateProject(ctx, projectID)
}

// propagateProject reloads and broadcasts every environment of a project.
func (s *Service) propagateProject(ctx context.Context, projectID string) error {
	envs, err := s.store.ListEnvironmentsByProject(ctx, projectID)
	if err != nil {
		return err
	}
	s.propagate(ctx, environmentIDs(envs))
	return nil
}

// propagate reloads the given environments locally (so the caller sees a
// consistent cache immediately) and broadcasts each to sibling replicas.
func (s *Service) propagate(ctx context.Context, environmentIDs []string) {
	for _, envID := range environmentIDs {
		if err := s.reloadEnv(ctx, envID); err != nil {
			s.log.Warn("local reload failed",
				slog.String("environment_id", envID), slog.String("error", err.Error()))
		}
		if err := s.bus.Publish(ctx, pubsub.Event{Type: pubsub.EventEnvironmentChanged, EnvironmentID: envID}); err != nil {
			s.log.Warn("broadcast failed",
				slog.String("environment_id", envID), slog.String("error", err.Error()))
		}
	}
}

func environmentIDs(envs []models.Environment) []string {
	out := make([]string, len(envs))
	for i, e := range envs {
		out[i] = e.ID
	}
	return out
}

// newSalt returns a random hex salt for a flag's rollout bucketing.
func newSalt() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
