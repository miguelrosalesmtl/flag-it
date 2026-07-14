package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const webhookColumns = `id, organization_id, url, secret, event_types, description, enabled,
	created_by, created_by_email, created_at`

// CreateWebhook inserts a webhook and returns it.
func (s *Store) CreateWebhook(ctx context.Context, w models.Webhook) (models.Webhook, error) {
	const q = `
		INSERT INTO webhooks (organization_id, url, secret, event_types, description, created_by, created_by_email)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + webhookColumns
	row := s.pool.QueryRow(ctx, q, w.OrganizationID, w.URL, w.Secret, w.EventTypes, w.Description, w.CreatedBy, w.CreatedByEmail)
	return scanWebhook(row)
}

// ListWebhooksByOrganization lists a organization's webhooks, newest first.
func (s *Store) ListWebhooksByOrganization(ctx context.Context, organizationID string) ([]models.Webhook, error) {
	return s.queryWebhooks(ctx, `SELECT `+webhookColumns+` FROM webhooks WHERE organization_id = $1 ORDER BY created_at DESC`, organizationID)
}

// ListEnabledWebhooksByOrganization returns a organization's enabled webhooks (delivery fan-out).
func (s *Store) ListEnabledWebhooksByOrganization(ctx context.Context, organizationID string) ([]models.Webhook, error) {
	return s.queryWebhooks(ctx, `SELECT `+webhookColumns+` FROM webhooks WHERE organization_id = $1 AND enabled = true`, organizationID)
}

func (s *Store) queryWebhooks(ctx context.Context, q string, args ...any) ([]models.Webhook, error) {
	rows, err := s.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("store: list webhooks: %w", err)
	}
	defer rows.Close()
	out := make([]models.Webhook, 0)
	for rows.Next() {
		w, err := scanWebhook(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, w)
	}
	return out, rows.Err()
}

// GetWebhook returns one webhook by id.
func (s *Store) GetWebhook(ctx context.Context, id string) (models.Webhook, error) {
	row := s.pool.QueryRow(ctx, `SELECT `+webhookColumns+` FROM webhooks WHERE id = $1`, id)
	w, err := scanWebhook(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Webhook{}, ErrNotFound
	}
	if err != nil {
		return models.Webhook{}, fmt.Errorf("store: get webhook: %w", err)
	}
	return w, nil
}

// SetWebhookEnabled toggles a webhook and returns it.
func (s *Store) SetWebhookEnabled(ctx context.Context, id string, enabled bool) (models.Webhook, error) {
	row := s.pool.QueryRow(ctx, `UPDATE webhooks SET enabled = $2 WHERE id = $1 RETURNING `+webhookColumns, id, enabled)
	w, err := scanWebhook(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Webhook{}, ErrNotFound
	}
	return w, err
}

// ResetWebhookSecret swaps in a new signing secret and returns the webhook.
func (s *Store) ResetWebhookSecret(ctx context.Context, id, secret string) (models.Webhook, error) {
	row := s.pool.QueryRow(ctx, `UPDATE webhooks SET secret = $2 WHERE id = $1 RETURNING `+webhookColumns, id, secret)
	w, err := scanWebhook(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.Webhook{}, ErrNotFound
	}
	return w, err
}

// DeleteWebhook removes a webhook (its deliveries cascade).
func (s *Store) DeleteWebhook(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM webhooks WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("store: delete webhook: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

const deliveryColumns = `id, webhook_id, event_type, payload, status, attempts,
	response_status, error, next_attempt_at, created_at, delivered_at`

// CreateWebhookDelivery enqueues a delivery.
func (s *Store) CreateWebhookDelivery(ctx context.Context, d models.WebhookDelivery) (models.WebhookDelivery, error) {
	const q = `
		INSERT INTO webhook_deliveries (webhook_id, event_type, payload)
		VALUES ($1, $2, $3)
		RETURNING ` + deliveryColumns
	row := s.pool.QueryRow(ctx, q, d.WebhookID, d.EventType, d.Payload)
	return scanDelivery(row)
}

// ListWebhookDeliveries returns a webhook's recent delivery attempts, newest first.
func (s *Store) ListWebhookDeliveries(ctx context.Context, webhookID string, limit int) ([]models.WebhookDelivery, error) {
	const q = `SELECT ` + deliveryColumns + ` FROM webhook_deliveries
		WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT $2`
	rows, err := s.pool.Query(ctx, q, webhookID, limit)
	if err != nil {
		return nil, fmt.Errorf("store: list webhook deliveries: %w", err)
	}
	defer rows.Close()
	out := make([]models.WebhookDelivery, 0)
	for rows.Next() {
		d, err := scanDelivery(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ListDueWebhookDeliveries returns pending deliveries whose time has come.
func (s *Store) ListDueWebhookDeliveries(ctx context.Context, now time.Time, limit int) ([]models.WebhookDelivery, error) {
	const q = `SELECT ` + deliveryColumns + ` FROM webhook_deliveries
		WHERE status = 'pending' AND next_attempt_at <= $1
		ORDER BY next_attempt_at ASC LIMIT $2`
	rows, err := s.pool.Query(ctx, q, now, limit)
	if err != nil {
		return nil, fmt.Errorf("store: list due webhook deliveries: %w", err)
	}
	defer rows.Close()
	out := make([]models.WebhookDelivery, 0)
	for rows.Next() {
		d, err := scanDelivery(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// UpdateWebhookDeliveryResult records the outcome of a delivery attempt: either a
// terminal status (success/failed) or a reschedule (pending + next_attempt_at).
func (s *Store) UpdateWebhookDeliveryResult(ctx context.Context, d models.WebhookDelivery) error {
	_, err := s.pool.Exec(ctx, `UPDATE webhook_deliveries
		SET status = $2, attempts = $3, response_status = $4, error = $5,
		    next_attempt_at = $6, delivered_at = $7
		WHERE id = $1`,
		d.ID, d.Status, d.Attempts, d.ResponseStatus, d.Error, d.NextAttemptAt, d.DeliveredAt)
	if err != nil {
		return fmt.Errorf("store: update webhook delivery: %w", err)
	}
	return nil
}

func scanWebhook(row pgx.Row) (models.Webhook, error) {
	var w models.Webhook
	err := row.Scan(&w.ID, &w.OrganizationID, &w.URL, &w.Secret, &w.EventTypes, &w.Description, &w.Enabled,
		&w.CreatedBy, &w.CreatedByEmail, &w.CreatedAt)
	if err != nil {
		return models.Webhook{}, err
	}
	return w, nil
}

func scanDelivery(row pgx.Row) (models.WebhookDelivery, error) {
	var d models.WebhookDelivery
	err := row.Scan(&d.ID, &d.WebhookID, &d.EventType, &d.Payload, &d.Status, &d.Attempts,
		&d.ResponseStatus, &d.Error, &d.NextAttemptAt, &d.CreatedAt, &d.DeliveredAt)
	if err != nil {
		return models.WebhookDelivery{}, err
	}
	return d, nil
}
