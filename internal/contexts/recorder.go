// Package contexts records the contexts seen during evaluation and serves the
// Contexts inspector. Recording is buffered in memory and flushed on an interval
// (one upsert per unique context, never one write per eval) — the same
// bounded-write approach as analytics, so it stays off the eval hot path.
package contexts

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// Store is the persistence the recorder flushes to and queries.
type Store interface {
	UpsertContexts(ctx context.Context, environmentID string, recs []store.ContextRecord) error
	ListContexts(ctx context.Context, environmentID, search string, limit int) ([]models.SeenContext, error)
	GetContext(ctx context.Context, environmentID, kind, key string) (models.SeenContext, error)
}

type bufKey struct {
	envID string
	kind  string
	key   string
}

// Recorder buffers seen contexts and flushes them periodically.
type Recorder struct {
	store    Store
	interval time.Duration
	log      *slog.Logger

	mu   sync.Mutex
	seen map[bufKey]map[string]any // latest attributes per context
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
		seen:     make(map[bufKey]map[string]any),
	}
}

// Record buffers a context part seen in an environment (cheap; hot-path safe).
func (r *Recorder) Record(environmentID string, part models.ContextPart) {
	if part.Key == "" {
		return
	}
	r.mu.Lock()
	r.seen[bufKey{environmentID, part.Kind, part.Key}] = part.Attributes
	r.mu.Unlock()
}

// List returns an environment's seen contexts (most-recent first).
func (r *Recorder) List(ctx context.Context, environmentID, search string, limit int) ([]models.SeenContext, error) {
	return r.store.ListContexts(ctx, environmentID, search, limit)
}

// Get returns one seen context by kind + key.
func (r *Recorder) Get(ctx context.Context, environmentID, kind, key string) (models.SeenContext, error) {
	return r.store.GetContext(ctx, environmentID, kind, key)
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

// flush drains the buffer and upserts it, grouped by environment.
func (r *Recorder) flush(ctx context.Context) {
	r.mu.Lock()
	if len(r.seen) == 0 {
		r.mu.Unlock()
		return
	}
	snapshot := r.seen
	r.seen = make(map[bufKey]map[string]any)
	r.mu.Unlock()

	byEnv := make(map[string][]store.ContextRecord)
	for k, attrs := range snapshot {
		raw, err := json.Marshal(attrs)
		if err != nil {
			raw = []byte("{}")
		}
		byEnv[k.envID] = append(byEnv[k.envID], store.ContextRecord{Kind: k.kind, Key: k.key, Attributes: raw})
	}

	for envID, recs := range byEnv {
		if err := r.store.UpsertContexts(ctx, envID, recs); err != nil {
			// Fold back so they retry next flush.
			r.mu.Lock()
			for _, rec := range recs {
				var attrs map[string]any
				_ = json.Unmarshal(rec.Attributes, &attrs)
				r.seen[bufKey{envID, rec.Kind, rec.Key}] = attrs
			}
			r.mu.Unlock()
			r.log.Warn("contexts: flush failed", slog.String("error", err.Error()))
		}
	}
}
