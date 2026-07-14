// Package webhooks delivers outbound event notifications: a organization registers a
// URL, and subscribed events (audit entries) are delivered to it as signed POSTs
// by a background worker with retries.
package webhooks

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// ErrNoEventTypes is returned when a webhook subscribes to nothing.
var ErrNoEventTypes = errors.New("webhooks: at least one event type is required")

// Service manages webhooks and enqueues/delivers their events.
type Service struct {
	store  *store.Store
	log    *slog.Logger
	client *http.Client
}

// New returns a webhooks Service. The HTTP client bounds per-delivery time so a
// slow receiver can't tie up the deliverer.
func New(st *store.Store, log *slog.Logger) *Service {
	return &Service{
		store:  st,
		log:    log,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// WebhookInput is the typed request to create a webhook.
type WebhookInput struct {
	OrganizationID string
	URL            string
	EventTypes     []string
	Description    string
	CreatedBy      string
	CreatedByEmail string
}

func newSecret() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "whsec_" + hex.EncodeToString(b), nil
}

// Create registers a webhook with a fresh signing secret.
func (s *Service) Create(ctx context.Context, in WebhookInput) (models.Webhook, error) {
	if len(in.EventTypes) == 0 {
		return models.Webhook{}, ErrNoEventTypes
	}
	secret, err := newSecret()
	if err != nil {
		return models.Webhook{}, err
	}
	return s.store.CreateWebhook(ctx, models.Webhook{
		OrganizationID: in.OrganizationID,
		URL:            in.URL,
		Secret:         secret,
		EventTypes:     in.EventTypes,
		Description:    in.Description,
		CreatedBy:      in.CreatedBy,
		CreatedByEmail: in.CreatedByEmail,
	})
}

// List returns a organization's webhooks.
func (s *Service) List(ctx context.Context, organizationID string) ([]models.Webhook, error) {
	return s.store.ListWebhooksByOrganization(ctx, organizationID)
}

// Get returns one webhook by id.
func (s *Service) Get(ctx context.Context, id string) (models.Webhook, error) {
	return s.store.GetWebhook(ctx, id)
}

// SetEnabled enables or disables a webhook.
func (s *Service) SetEnabled(ctx context.Context, id string, enabled bool) (models.Webhook, error) {
	return s.store.SetWebhookEnabled(ctx, id, enabled)
}

// ResetSecret issues a new signing secret.
func (s *Service) ResetSecret(ctx context.Context, id string) (models.Webhook, error) {
	secret, err := newSecret()
	if err != nil {
		return models.Webhook{}, err
	}
	return s.store.ResetWebhookSecret(ctx, id, secret)
}

// Delete removes a webhook.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteWebhook(ctx, id)
}

// ListDeliveries returns a webhook's recent delivery attempts.
func (s *Service) ListDeliveries(ctx context.Context, webhookID string, limit int) ([]models.WebhookDelivery, error) {
	return s.store.ListWebhookDeliveries(ctx, webhookID, limit)
}

// Enqueue fans an event out to every enabled webhook in the organization that
// subscribes to it, creating a pending delivery each. It implements the audit
// service's event-emitter seam; failures are logged, never propagated, so they
// cannot fail the audited operation.
func (s *Service) Enqueue(ctx context.Context, organizationID, eventType string, payload json.RawMessage) {
	if organizationID == "" {
		return // platform-level events have no organization to route to
	}
	hooks, err := s.store.ListEnabledWebhooksByOrganization(ctx, organizationID)
	if err != nil {
		s.log.Warn("webhooks: enqueue lookup failed", slog.String("error", err.Error()))
		return
	}
	for _, w := range hooks {
		if !w.Subscribes(eventType) {
			continue
		}
		if _, err := s.store.CreateWebhookDelivery(ctx, models.WebhookDelivery{
			WebhookID: w.ID, EventType: eventType, Payload: payload,
		}); err != nil {
			s.log.Warn("webhooks: enqueue failed",
				slog.String("webhook", w.ID), slog.String("error", err.Error()))
		}
	}
}

// Test enqueues a synthetic event to a webhook, so a manager can verify delivery.
func (s *Service) Test(ctx context.Context, webhookID string) (models.WebhookDelivery, error) {
	w, err := s.store.GetWebhook(ctx, webhookID)
	if err != nil {
		return models.WebhookDelivery{}, err
	}
	payload, _ := json.Marshal(map[string]any{
		"action":     "webhook.test",
		"message":    "This is a test event from flag-it.",
		"webhook_id": w.ID,
	})
	return s.store.CreateWebhookDelivery(ctx, models.WebhookDelivery{
		WebhookID: w.ID, EventType: "webhook.test", Payload: payload,
	})
}
