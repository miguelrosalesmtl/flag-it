// Package analytics accumulates flag-evaluation counts in memory and flushes
// them to the store on an interval as rolled-up counters. This keeps write
// volume bounded (one row per flag/variation/window) regardless of eval rate —
// the same summary approach LaunchDarkly SDKs use, applied server-side.
package analytics

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// Store is the persistence the recorder flushes to and queries.
type Store interface {
	UpsertEvalStats(ctx context.Context, stats []models.EvalStat) error
	QueryEvalStats(ctx context.Context, environmentID, flagKey string, since time.Time) ([]models.VariationCount, error)
	EnvEvalStats(ctx context.Context, environmentID string, since time.Time) ([]models.FlagCount, error)
}

type counterKey struct {
	envID     string
	flagKey   string
	variation int
}

// Recorder buffers evaluation counts and flushes them periodically.
type Recorder struct {
	store    Store
	interval time.Duration
	log      *slog.Logger

	mu     sync.Mutex
	counts map[counterKey]int64
}

// New returns a Recorder. interval <= 0 defaults to 30s.
func New(store Store, interval time.Duration, log *slog.Logger) *Recorder {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	return &Recorder{
		store:    store,
		interval: interval,
		log:      log,
		counts:   make(map[counterKey]int64),
	}
}

// QueryStats returns rolled-up per-variation counts for a flag in an environment
// since the given time.
func (r *Recorder) QueryStats(ctx context.Context, environmentID, flagKey string, since time.Time) ([]models.VariationCount, error) {
	return r.store.QueryEvalStats(ctx, environmentID, flagKey, since)
}

// QueryEnvStats returns each flag's total evaluations in an environment since the
// given time, most-active first.
func (r *Recorder) QueryEnvStats(ctx context.Context, environmentID string, since time.Time) ([]models.FlagCount, error) {
	return r.store.EnvEvalStats(ctx, environmentID, since)
}

// Record counts one evaluation (in-memory; cheap enough for the hot path).
func (r *Recorder) Record(envID, flagKey string, variation int) {
	r.RecordN(envID, flagKey, variation, 1)
}

// RecordN adds n evaluations, e.g. from a client-pushed summary.
func (r *Recorder) RecordN(envID, flagKey string, variation int, n int64) {
	if n <= 0 {
		return
	}
	r.mu.Lock()
	r.counts[counterKey{envID, flagKey, variation}] += n
	r.mu.Unlock()
}

// Start flushes on the interval until ctx is cancelled, then flushes once more.
func (r *Recorder) Start(ctx context.Context) {
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			r.flush(context.Background())
			return
		case <-ticker.C:
			r.flush(ctx)
		}
	}
}

// flush drains the buffer and upserts it into the store, bucketed to the minute.
func (r *Recorder) flush(ctx context.Context) {
	r.mu.Lock()
	if len(r.counts) == 0 {
		r.mu.Unlock()
		return
	}
	snapshot := r.counts
	r.counts = make(map[counterKey]int64)
	r.mu.Unlock()

	window := time.Now().Truncate(time.Minute)
	stats := make([]models.EvalStat, 0, len(snapshot))
	for k, n := range snapshot {
		stats = append(stats, models.EvalStat{
			EnvironmentID: k.envID, FlagKey: k.flagKey, Variation: k.variation,
			WindowStart: window, Count: n,
		})
	}

	if err := r.store.UpsertEvalStats(ctx, stats); err != nil {
		// On failure, fold the counts back so they're retried next flush.
		r.mu.Lock()
		for k, n := range snapshot {
			r.counts[k] += n
		}
		r.mu.Unlock()
		r.log.Warn("analytics: flush failed", slog.String("error", err.Error()))
	}
}
