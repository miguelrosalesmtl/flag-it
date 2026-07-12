// Package pubsub implements the Redis-backed broadcast bus that keeps every
// replica's in-memory flag cache consistent.
//
// When a flag is created, updated, or deleted through the API, the handling
// replica writes to Postgres (source of truth) and then publishes a small
// event on a Redis channel. Every replica — including the publisher — is
// subscribed to that channel and reloads the affected flag from Postgres when
// it receives the event. This is how a horizontally-scaled deployment converges
// on a consistent view without every read hitting the database.
package pubsub

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/miguelrosalesmtl/flag-it/internal/settings"
	"github.com/redis/go-redis/v9"
)

// EventType enumerates the kinds of change broadcasts.
type EventType string

const (
	// EventEnvironmentChanged asks replicas to reload one environment's flag
	// configs from Postgres. It is the single unit of cache invalidation.
	EventEnvironmentChanged EventType = "environment.changed"
	// EventEnvironmentRemoved asks replicas to drop an environment from cache.
	EventEnvironmentRemoved EventType = "environment.removed"
)

// Event is the payload broadcast on the Redis channel. It carries only which
// environment changed — receivers reload the authoritative config from Postgres,
// so the message stays small and the database remains the source of truth.
type Event struct {
	Type EventType `json:"type"`
	// EnvironmentID identifies the environment whose flag configs changed.
	EnvironmentID string `json:"environment_id"`
	// OriginInstance is the InstanceID of the publisher, so replicas can skip
	// reacting to their own broadcasts if desired.
	OriginInstance string `json:"origin_instance"`
}

// Handler is invoked for every event received on the subscribed channel.
type Handler func(ctx context.Context, evt Event)

// Bus wraps a Redis client and the configured broadcast channel.
type Bus struct {
	client   *redis.Client
	channel  string
	instance string
	log      *slog.Logger
}

// NewBus connects to Redis and returns a ready-to-use Bus.
func NewBus(ctx context.Context, cfg settings.Redis, instanceID string, log *slog.Logger) (*Bus, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("pubsub: ping redis: %w", err)
	}

	// A stable, non-empty instance id lets replicas ignore their own broadcasts
	// (they've already applied the change locally).
	if instanceID == "" {
		b := make([]byte, 8)
		_, _ = rand.Read(b)
		instanceID = "replica-" + hex.EncodeToString(b)
	}

	return &Bus{
		client:   client,
		channel:  cfg.Channel,
		instance: instanceID,
		log:      log,
	}, nil
}

// InstanceID returns this bus's origin id (used to skip self-published events).
func (b *Bus) InstanceID() string { return b.instance }

// Publish broadcasts an event to all subscribed replicas.
func (b *Bus) Publish(ctx context.Context, evt Event) error {
	evt.OriginInstance = b.instance
	payload, err := json.Marshal(evt)
	if err != nil {
		return fmt.Errorf("pubsub: marshal event: %w", err)
	}
	if err := b.client.Publish(ctx, b.channel, payload).Err(); err != nil {
		return fmt.Errorf("pubsub: publish: %w", err)
	}
	return nil
}

// Subscribe blocks, dispatching every received event to handler until ctx is
// cancelled. Run it in its own goroutine. It returns nil on graceful shutdown.
func (b *Bus) Subscribe(ctx context.Context, handler Handler) error {
	sub := b.client.Subscribe(ctx, b.channel)
	defer sub.Close()

	// Ensure the subscription is established before we start consuming.
	if _, err := sub.Receive(ctx); err != nil {
		return fmt.Errorf("pubsub: establish subscription: %w", err)
	}

	ch := sub.Channel()
	b.log.Info("subscribed to flag change channel", slog.String("channel", b.channel))

	for {
		select {
		case <-ctx.Done():
			return nil
		case msg, ok := <-ch:
			if !ok {
				return nil
			}
			var evt Event
			if err := json.Unmarshal([]byte(msg.Payload), &evt); err != nil {
				b.log.Warn("pubsub: drop malformed event", slog.String("error", err.Error()))
				continue
			}
			handler(ctx, evt)
		}
	}
}

// Ping verifies connectivity — used by the health check.
func (b *Bus) Ping(ctx context.Context) error {
	return b.client.Ping(ctx).Err()
}

// Close releases the underlying Redis client.
func (b *Bus) Close() error {
	return b.client.Close()
}
