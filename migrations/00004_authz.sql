-- +goose Up

-- Per-project role for a organization member. Absence of a row = no access to that
-- project. organization_admins bypass this table entirely (full organization access).
CREATE TABLE project_roles (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('writer', 'reader')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, project_id)
);

-- The unique index leads with user_id; index project_id for "who can access
-- this project" lookups.
CREATE INDEX project_roles_project_id_idx ON project_roles (project_id);

-- SDK keys authenticate clients and identify which environment they evaluate
-- against. Multiple rows per environment support rotation; revoked_at retires a
-- key without deleting its history.
CREATE TABLE sdk_keys (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key            text NOT NULL UNIQUE,
    kind           text NOT NULL CHECK (kind IN ('server', 'client')),
    name           text NOT NULL DEFAULT '',
    last_used_at   timestamptz,
    revoked_at     timestamptz,           -- null = active
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sdk_keys_environment_id_idx ON sdk_keys (environment_id);

-- +goose Down
DROP TABLE sdk_keys;
DROP TABLE project_roles;
