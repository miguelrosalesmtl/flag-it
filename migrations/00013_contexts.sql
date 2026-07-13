-- +goose Up
-- Contexts seen during evaluation (per environment). One row per (env, kind,
-- key), upserted by the periodic flush of an in-memory buffer — never one write
-- per eval. Powers the Contexts inspector.
CREATE TABLE contexts (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    kind           text NOT NULL,
    key            text NOT NULL,
    attributes     jsonb NOT NULL DEFAULT '{}',
    first_seen     timestamptz NOT NULL DEFAULT now(),
    last_seen      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (environment_id, kind, key)
);

CREATE INDEX contexts_recent_idx ON contexts (environment_id, last_seen DESC);

-- +goose Down
DROP TABLE contexts;
