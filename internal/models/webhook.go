package models

import (
	"encoding/json"
	"time"
)

// EventTypeAll subscribes a webhook to every event.
const EventTypeAll = "*"

// Webhook delivery statuses.
const (
	DeliveryPending = "pending"
	DeliverySuccess = "success"
	DeliveryFailed  = "failed"
)

// Webhook is a tenant's registered endpoint that receives signed POSTs when a
// subscribed event occurs. The secret signs the payload (HMAC-SHA256) and is
// returned to managers on create/reset only.
type Webhook struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	URL            string    `json:"url"`
	Secret         string    `json:"secret,omitempty"` // shown once, on create/reset
	EventTypes     []string  `json:"event_types"`
	Description    string    `json:"description"`
	Enabled        bool      `json:"enabled"`
	CreatedBy      string    `json:"created_by"`
	CreatedByEmail string    `json:"created_by_email"`
	CreatedAt      time.Time `json:"created_at"`
}

// Subscribes reports whether this webhook should receive the given event action.
func (w Webhook) Subscribes(action string) bool {
	for _, e := range w.EventTypes {
		if e == EventTypeAll || e == action {
			return true
		}
	}
	return false
}

// WebhookDelivery is one attempt-tracked delivery of an event to a webhook.
type WebhookDelivery struct {
	ID             string          `json:"id"`
	WebhookID      string          `json:"webhook_id"`
	EventType      string          `json:"event_type"`
	Payload        json.RawMessage `json:"payload"`
	Status         string          `json:"status"`
	Attempts       int             `json:"attempts"`
	ResponseStatus int             `json:"response_status"`
	Error          string          `json:"error,omitempty"`
	NextAttemptAt  time.Time       `json:"next_attempt_at"`
	CreatedAt      time.Time       `json:"created_at"`
	DeliveredAt    *time.Time      `json:"delivered_at,omitempty"`
}
