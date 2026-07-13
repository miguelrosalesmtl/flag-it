package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

const (
	// maxDeliveryAttempts caps retries before a delivery is marked failed.
	maxDeliveryAttempts = 5
	// dueBatchSize bounds how many deliveries one tick sends.
	dueBatchSize = 50
	// maxBackoff caps the retry delay.
	maxBackoff = 10 * time.Minute
)

// StartDeliverer sends due webhook deliveries on an interval until the context
// is cancelled. Run it in a goroutine, like the analytics recorder / scheduler.
func (s *Service) StartDeliverer(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 10 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.deliverDue(ctx)
		}
	}
}

func (s *Service) deliverDue(ctx context.Context) {
	due, err := s.store.ListDueWebhookDeliveries(ctx, time.Now(), dueBatchSize)
	if err != nil {
		s.log.Error("webhooks: list due deliveries", slog.Any("error", err))
		return
	}
	for _, d := range due {
		s.attemptDelivery(ctx, d)
	}
}

// attemptDelivery makes one HTTP attempt and records the result — a terminal
// success/failed, or a reschedule with backoff.
func (s *Service) attemptDelivery(ctx context.Context, d models.WebhookDelivery) {
	w, err := s.store.GetWebhook(ctx, d.WebhookID)
	if err != nil {
		// Webhook gone (deleted) — mark the delivery failed and move on.
		s.finalize(ctx, d, models.DeliveryFailed, 0, "webhook not found")
		return
	}

	status, sendErr := s.send(ctx, w, d)
	d.Attempts++
	if sendErr == nil && status >= 200 && status < 300 {
		d.ResponseStatus = status
		s.finalize(ctx, d, models.DeliverySuccess, status, "")
		return
	}

	msg := fmt.Sprintf("status %d", status)
	if sendErr != nil {
		msg = sendErr.Error()
	}
	if d.Attempts >= maxDeliveryAttempts {
		s.finalize(ctx, d, models.DeliveryFailed, status, msg)
		return
	}
	// Reschedule with exponential backoff.
	d.Status = models.DeliveryPending
	d.ResponseStatus = status
	d.Error = msg
	d.NextAttemptAt = time.Now().Add(backoff(d.Attempts))
	if err := s.store.UpdateWebhookDeliveryResult(ctx, d); err != nil {
		s.log.Error("webhooks: reschedule delivery", slog.String("id", d.ID), slog.Any("error", err))
	}
}

// send POSTs the payload with an HMAC-SHA256 signature over the body.
func (s *Service) send(ctx context.Context, w models.Webhook, d models.WebhookDelivery) (int, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, w.URL, bytes.NewReader(d.Payload))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "flag-it-webhooks/1")
	req.Header.Set("X-FlagIt-Event", d.EventType)
	req.Header.Set("X-FlagIt-Delivery", d.ID)
	req.Header.Set("X-FlagIt-Signature", sign(w.Secret, d.Payload))

	resp, err := s.client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, io.LimitReader(resp.Body, 4096)) // drain to reuse the connection
	return resp.StatusCode, nil
}

func (s *Service) finalize(ctx context.Context, d models.WebhookDelivery, status string, respStatus int, msg string) {
	now := time.Now()
	d.Status = status
	d.ResponseStatus = respStatus
	d.Error = msg
	d.DeliveredAt = &now
	d.NextAttemptAt = now
	if err := s.store.UpdateWebhookDeliveryResult(ctx, d); err != nil {
		s.log.Error("webhooks: finalize delivery", slog.String("id", d.ID), slog.Any("error", err))
	}
}

// sign returns the "sha256=<hex>" HMAC of body keyed by the webhook secret.
func sign(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

// backoff is the delay before retry N (1-based): 30s, 60s, 120s, … capped.
func backoff(attempt int) time.Duration {
	d := 30 * time.Second << (attempt - 1)
	if d > maxBackoff || d <= 0 {
		return maxBackoff
	}
	return d
}
