-- +goose Up
-- Approval workflow: a proposed change to a flag's environment config (a set of
-- semantic instructions) that must be reviewed before it is applied.
CREATE TABLE change_requests (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id    uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    environment_key   text NOT NULL,
    flag_key          text NOT NULL,
    instructions      jsonb NOT NULL,
    comment           text NOT NULL DEFAULT '',
    status            text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    requested_by      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_email text NOT NULL DEFAULT '',
    reviewed_by       uuid REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_email text NOT NULL DEFAULT '',
    review_comment    text NOT NULL DEFAULT '',
    created_at        timestamptz NOT NULL DEFAULT now(),
    reviewed_at       timestamptz
);

CREATE INDEX change_requests_project_status_idx
    ON change_requests (project_id, status, created_at DESC);

-- +goose Down
DROP TABLE change_requests;
