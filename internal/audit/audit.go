// Package audit is the service for the append-only change log: recording entries
// (attributed to an actor) and querying a organization's history.
package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// EventEmitter receives each recorded entry for fan-out to external subscribers
// (outbound webhooks). It is the seam that lets the audit log double as the event
// stream without the audit package depending on webhooks.
type EventEmitter interface {
	Enqueue(ctx context.Context, organizationID, eventType string, payload json.RawMessage)
}

// Service records and lists audit entries.
type Service struct {
	store   *store.Store
	log     *slog.Logger
	emitter EventEmitter
}

// New returns an audit Service.
func New(st *store.Store, log *slog.Logger) *Service {
	return &Service{store: st, log: log}
}

// SetEmitter wires an event emitter (e.g. the webhooks service) that receives
// every recorded entry. Call it once at startup; nil leaves emission off.
func (s *Service) SetEmitter(e EventEmitter) {
	s.emitter = e
}

// Record writes an entry attributed to the given actor id, resolving the actor's
// email for the trail. Best-effort: a failure is logged, never propagated, so it
// cannot fail the underlying operation.
func (s *Service) Record(ctx context.Context, actorID string, e models.AuditEntry) {
	e.ActorID = actorID
	if actorID != "" {
		if u, err := s.store.GetUserByID(ctx, actorID); err == nil {
			e.ActorEmail = u.Email
		}
	}
	s.write(ctx, e)
}

// RecordAs writes an entry attributed to an explicit actor (used by public
// endpoints such as first-run setup, where there is no context principal).
func (s *Service) RecordAs(ctx context.Context, actor models.User, e models.AuditEntry) {
	e.ActorID = actor.ID
	e.ActorEmail = actor.Email
	s.write(ctx, e)
}

func (s *Service) write(ctx context.Context, e models.AuditEntry) {
	if err := s.store.CreateAuditEntry(ctx, e); err != nil {
		s.log.Warn("audit: record failed",
			slog.String("action", e.Action), slog.String("error", err.Error()))
		return
	}
	s.emit(ctx, e)
}

// emit fans the recorded entry out to the event emitter (webhooks). Best-effort:
// only organization-scoped events route, and any failure is swallowed by the emitter.
func (s *Service) emit(ctx context.Context, e models.AuditEntry) {
	if s.emitter == nil || e.OrganizationID == "" {
		return
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now()
	}
	payload, err := json.Marshal(e)
	if err != nil {
		return
	}
	s.emitter.Enqueue(ctx, e.OrganizationID, e.Action, payload)
}

// ListParams filters an audit query. Mirrors the store filter but keeps the
// transport layer from importing the store's type.
type ListParams struct {
	ProjectID    string
	ResourceType string
	ResourceKey  string
	Before       string
	Limit        int
}

// List returns a organization's change history, newest first.
func (s *Service) List(ctx context.Context, organizationID string, p ListParams) ([]models.AuditEntry, error) {
	return s.store.ListAuditEntries(ctx, organizationID, store.AuditFilter{
		ProjectID:    p.ProjectID,
		ResourceType: p.ResourceType,
		ResourceKey:  p.ResourceKey,
		Before:       p.Before,
		Limit:        p.Limit,
	})
}
