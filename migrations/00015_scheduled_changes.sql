-- +goose Up
-- Scheduled changes: a set of semantic instructions applied to a flag's
-- environment config automatically at a future time.
CREATE TABLE scheduled_changes (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id    uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    environment_key   text NOT NULL,
    flag_key          text NOT NULL,
    instructions      jsonb NOT NULL,
    comment           text NOT NULL DEFAULT '',
    scheduled_for     timestamptz NOT NULL,
    status            text NOT NULL DEFAULT 'pending', -- pending | applied | cancelled | failed
    error             text NOT NULL DEFAULT '',
    created_by        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_email  text NOT NULL DEFAULT '',
    created_at        timestamptz NOT NULL DEFAULT now(),
    applied_at        timestamptz
);

-- The scheduler scans for due, pending changes ordered by time.
CREATE INDEX scheduled_changes_due_idx
    ON scheduled_changes (scheduled_for)
    WHERE status = 'pending';

CREATE INDEX scheduled_changes_project_status_idx
    ON scheduled_changes (project_id, status, scheduled_for);

-- +goose Down
DROP TABLE scheduled_changes;
