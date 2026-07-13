-- +goose Up
-- Outbound webhooks: a tenant registers a URL to receive signed POSTs when
-- events happen (an event is any audit entry whose action the webhook subscribes
-- to; '*' subscribes to all).
CREATE TABLE webhooks (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url               text NOT NULL,
    secret            text NOT NULL,
    event_types       text[] NOT NULL DEFAULT '{}', -- audit actions, or '*'
    description       text NOT NULL DEFAULT '',
    enabled           boolean NOT NULL DEFAULT true,
    created_by        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_email  text NOT NULL DEFAULT '',
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhooks_tenant_idx ON webhooks (tenant_id, created_at DESC);

-- The delivery queue + log: one row per (webhook, event), retried with backoff.
CREATE TABLE webhook_deliveries (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    webhook_id        uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type        text NOT NULL,
    payload           jsonb NOT NULL,
    status            text NOT NULL DEFAULT 'pending', -- pending | success | failed
    attempts          integer NOT NULL DEFAULT 0,
    response_status   integer NOT NULL DEFAULT 0,
    error             text NOT NULL DEFAULT '',
    next_attempt_at   timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    delivered_at      timestamptz
);

-- The deliverer scans for due, pending rows.
CREATE INDEX webhook_deliveries_due_idx
    ON webhook_deliveries (next_attempt_at)
    WHERE status = 'pending';

CREATE INDEX webhook_deliveries_webhook_idx
    ON webhook_deliveries (webhook_id, created_at DESC);

-- +goose Down
DROP TABLE webhook_deliveries;
DROP TABLE webhooks;
