-- +goose Up
-- Immutable change history. Append-only: no updates/deletes in normal operation.
CREATE TABLE audit_log (
    id            uuid PRIMARY KEY DEFAULT uuidv7(),
    organization_id     uuid REFERENCES organizations(id)  ON DELETE CASCADE,   -- null = platform-level
    project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,  -- keep entry if project deleted
    actor_id      uuid,                                             -- not FK: survives user deletion
    actor_email   text NOT NULL DEFAULT '',
    action        text NOT NULL,
    resource_type text NOT NULL,
    resource_key  text NOT NULL DEFAULT '',
    comment       text NOT NULL DEFAULT '',
    data          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Query paths: recent activity per organization / per project, and by resource.
CREATE INDEX audit_log_organization_created_idx  ON audit_log (organization_id, id DESC);
CREATE INDEX audit_log_project_created_idx ON audit_log (project_id, id DESC);
CREATE INDEX audit_log_resource_idx        ON audit_log (organization_id, resource_type, resource_key);

-- +goose Down
DROP TABLE audit_log;
