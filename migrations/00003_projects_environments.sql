-- +goose Up

-- Projects are applications within a organization (LaunchDarkly "projects").
CREATE TABLE projects (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key        text NOT NULL,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, key)
);

-- Environments are deployment targets within a project (production, staging, …).
-- A flag's evaluable config lives per-environment (see 00005_flags).
CREATE TABLE environments (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key        text NOT NULL,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, key)
);

-- +goose Down
DROP TABLE environments;
DROP TABLE projects;
