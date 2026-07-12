-- +goose Up

-- Flag definition, shared across all environments of its project. Variations
-- (the set of possible values) live here so they stay consistent everywhere.
CREATE TABLE flags (
    id          uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key         text NOT NULL,
    name        text NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    variations  jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, key)
);

-- Per-environment config: the row actually consulted during evaluation. The same
-- flag can be on in staging and off in production with different targeting.
CREATE TABLE flag_environments (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    flag_id           uuid NOT NULL REFERENCES flags(id)        ON DELETE CASCADE,
    environment_id    uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    enabled           boolean NOT NULL DEFAULT false,
    default_variation integer NOT NULL DEFAULT 0,
    off_variation     integer NOT NULL DEFAULT 0,
    targets           jsonb   NOT NULL DEFAULT '{}'::jsonb,
    rollout           jsonb   NOT NULL DEFAULT '[]'::jsonb,
    version           integer NOT NULL DEFAULT 1,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (flag_id, environment_id)
);

-- Warming a replica's cache loads every flag config for one environment, so
-- index that access path.
CREATE INDEX flag_environments_environment_id_idx ON flag_environments (environment_id);

-- +goose Down
DROP TABLE flag_environments;
DROP TABLE flags;
