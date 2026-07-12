-- +goose Up
-- Segments: reusable, named collections of contexts referenced by segmentMatch
-- clauses. Project-scoped and shared across the project's environments.
CREATE TABLE segments (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key               text NOT NULL,
    name              text NOT NULL DEFAULT '',
    description       text NOT NULL DEFAULT '',
    salt              text NOT NULL DEFAULT '',
    included          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- user keys always in
    excluded          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- user keys never in
    included_contexts jsonb NOT NULL DEFAULT '[]'::jsonb,  -- non-user kinds
    excluded_contexts jsonb NOT NULL DEFAULT '[]'::jsonb,
    rules             jsonb NOT NULL DEFAULT '[]'::jsonb,
    version           integer NOT NULL DEFAULT 1,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, key)
);

-- Cache warming/reload loads a project's segments for each of its environments.
CREATE INDEX segments_project_id_idx ON segments (project_id);

-- +goose Down
DROP TABLE segments;
