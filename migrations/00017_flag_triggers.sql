-- +goose Up
-- Flag triggers: an inbound webhook. POSTing to the trigger's unguessable URL
-- (the token IS the auth) applies a fixed action to a flag in an environment —
-- e.g. an alerting system flips a kill-switch off.
CREATE TABLE flag_triggers (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id    uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    environment_key   text NOT NULL,
    flag_key          text NOT NULL,
    action            text NOT NULL, -- 'on' | 'off' (display); instructions carry the effect
    instructions      jsonb NOT NULL,
    token             text NOT NULL UNIQUE,
    description       text NOT NULL DEFAULT '',
    enabled           boolean NOT NULL DEFAULT true,
    exec_count        bigint NOT NULL DEFAULT 0,
    created_by        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_email  text NOT NULL DEFAULT '',
    created_at        timestamptz NOT NULL DEFAULT now(),
    last_executed_at  timestamptz
);

CREATE INDEX flag_triggers_project_idx ON flag_triggers (project_id, flag_key, environment_key);

-- +goose Down
DROP TABLE flag_triggers;
