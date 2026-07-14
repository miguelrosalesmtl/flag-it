-- +goose Up
-- Squashed baseline (was migrations 00001–00018). One clean schema to start from;
-- the incremental history was collapsed once the design stabilised.
--
-- Hierarchy: Organization → Project → Environment → (SDK key | flag config).
-- Authz: dynamic per-organization roles (permission bundles) + scoped assignments.

-- citext gives us case-insensitive emails. uuidv7() is built into Postgres 18+.
CREATE EXTENSION IF NOT EXISTS citext;

-- Global user identities. A user may belong to many organizations via memberships.
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT uuidv7(),
    email         citext NOT NULL UNIQUE,
    password_hash text,                    -- nullable: room for SSO/OIDC later
    full_name     text NOT NULL DEFAULT '',
    is_superuser  boolean NOT NULL DEFAULT false,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Organizations are the isolated top-level accounts (LaunchDarkly "accounts").
CREATE TABLE organizations (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    slug       text NOT NULL UNIQUE,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- A user's belonging to an organization. The base role model is dynamic (see
-- roles / role_assignments below), so this table is membership-only.
CREATE TABLE memberships (
    id              uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id         uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, organization_id)
);
CREATE INDEX memberships_organization_id_idx ON memberships (organization_id);

-- Projects are applications within an organization (LaunchDarkly "projects").
CREATE TABLE projects (
    id              uuid PRIMARY KEY DEFAULT uuidv7(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key             text NOT NULL,
    name            text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, key)
);

-- Environments are deployment targets within a project (production, staging, …).
CREATE TABLE environments (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key        text NOT NULL,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, key)
);

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

-- A role is a per-organization bundle of permissions, assignable at one scope.
CREATE TABLE roles (
    id              uuid PRIMARY KEY DEFAULT uuidv7(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key             text NOT NULL,
    name            text NOT NULL,
    description     text NOT NULL DEFAULT '',
    scope           text NOT NULL CHECK (scope IN ('organization', 'project')),
    is_system       boolean NOT NULL DEFAULT false,   -- seeded defaults; not deletable
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, key)
);

-- The permissions a role grants (from the code vocabulary).
CREATE TABLE role_permissions (
    role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission text NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- A user holds a role at a scope: an organization (covers all its projects) or one
-- project. Exactly one of organization_id / project_id is set, matching scope_type.
CREATE TABLE role_assignments (
    id              uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope_type      text NOT NULL CHECK (scope_type IN ('organization', 'project')),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (scope_type = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
        (scope_type = 'project'      AND project_id IS NOT NULL AND organization_id IS NULL)
    ),
    -- NULLS NOT DISTINCT (PG15+) so the null scope column doesn't defeat uniqueness.
    UNIQUE NULLS NOT DISTINCT (user_id, role_id, organization_id, project_id)
);
CREATE INDEX role_assignments_user_id_idx         ON role_assignments (user_id);
CREATE INDEX role_assignments_organization_id_idx ON role_assignments (organization_id);
CREATE INDEX role_assignments_project_id_idx      ON role_assignments (project_id);

-- Flag definition, shared across all environments of its project. Variations (the
-- set of possible values) live here so they stay consistent everywhere. salt is a
-- stable per-flag value for rollout bucketing.
CREATE TABLE flags (
    id                    uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key                   text NOT NULL,
    name                  text NOT NULL DEFAULT '',
    description           text NOT NULL DEFAULT '',
    salt                  text NOT NULL DEFAULT '',
    client_side_available boolean NOT NULL DEFAULT false,  -- expose to client (public) SDK keys
    temporary             boolean NOT NULL DEFAULT false,  -- short-lived; drives stale detection
    variations            jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, key)
);

-- Per-environment config: the row consulted during evaluation. The same flag can
-- be on in staging and off in production with different targeting. Targeting is
-- stored as JSONB — individual targets, ordered rules of clauses, a fallthrough
-- (variation-or-rollout), and prerequisites.
CREATE TABLE flag_environments (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    flag_id        uuid NOT NULL REFERENCES flags(id)        ON DELETE CASCADE,
    environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    enabled        boolean NOT NULL DEFAULT false,
    off_variation  integer NOT NULL DEFAULT 0,
    targets        jsonb   NOT NULL DEFAULT '[]'::jsonb,
    rules          jsonb   NOT NULL DEFAULT '[]'::jsonb,
    fallthrough    jsonb   NOT NULL DEFAULT '{"variation":0}'::jsonb,
    prerequisites  jsonb   NOT NULL DEFAULT '[]'::jsonb,
    version        integer NOT NULL DEFAULT 1,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (flag_id, environment_id)
);
-- Warming a replica's cache loads every flag config for one environment.
CREATE INDEX flag_environments_environment_id_idx ON flag_environments (environment_id);

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
CREATE INDEX segments_project_id_idx ON segments (project_id);

-- Immutable change history. Append-only: no updates/deletes in normal operation.
CREATE TABLE audit_log (
    id            uuid PRIMARY KEY DEFAULT uuidv7(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,   -- null = platform-level
    project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,         -- keep entry if project deleted
    actor_id      uuid,                                                    -- not FK: survives user deletion
    actor_email   text NOT NULL DEFAULT '',
    action        text NOT NULL,
    resource_type text NOT NULL,
    resource_key  text NOT NULL DEFAULT '',
    comment       text NOT NULL DEFAULT '',
    data          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_organization_created_idx ON audit_log (organization_id, id DESC);
CREATE INDEX audit_log_project_created_idx      ON audit_log (project_id, id DESC);
CREATE INDEX audit_log_resource_idx             ON audit_log (organization_id, resource_type, resource_key);

-- Rolled-up evaluation counts (per flag, variation, environment, time window).
-- Written by the periodic flush of in-memory counters — never one row per eval.
CREATE TABLE flag_eval_stats (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    flag_key       text NOT NULL, -- text (not FK): stats survive flag deletion
    variation      integer NOT NULL,
    window_start   timestamptz NOT NULL,
    count          bigint NOT NULL DEFAULT 0,
    UNIQUE (environment_id, flag_key, variation, window_start)
);
CREATE INDEX flag_eval_stats_lookup_idx ON flag_eval_stats (environment_id, flag_key, window_start);

-- Contexts seen during evaluation (per environment). One row per (env, kind, key),
-- upserted by the periodic flush of an in-memory buffer. Powers the inspector.
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

-- Approval workflow: a proposed change to a flag's environment config (a set of
-- semantic instructions) that must be reviewed before it is applied.
CREATE TABLE change_requests (
    id                 uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id         uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id     uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    environment_key    text NOT NULL,
    flag_key           text NOT NULL,
    instructions       jsonb NOT NULL,
    comment            text NOT NULL DEFAULT '',
    status             text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    requested_by       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_email text NOT NULL DEFAULT '',
    reviewed_by        uuid REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_email  text NOT NULL DEFAULT '',
    review_comment     text NOT NULL DEFAULT '',
    created_at         timestamptz NOT NULL DEFAULT now(),
    reviewed_at        timestamptz
);
CREATE INDEX change_requests_project_status_idx ON change_requests (project_id, status, created_at DESC);

-- Scheduled changes: semantic instructions applied to a flag's environment config
-- automatically at a future time.
CREATE TABLE scheduled_changes (
    id               uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id   uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    environment_key  text NOT NULL,
    flag_key         text NOT NULL,
    instructions     jsonb NOT NULL,
    comment          text NOT NULL DEFAULT '',
    scheduled_for    timestamptz NOT NULL,
    status           text NOT NULL DEFAULT 'pending', -- pending | applied | cancelled | failed
    error            text NOT NULL DEFAULT '',
    created_by       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_email text NOT NULL DEFAULT '',
    created_at       timestamptz NOT NULL DEFAULT now(),
    applied_at       timestamptz
);
CREATE INDEX scheduled_changes_due_idx ON scheduled_changes (scheduled_for) WHERE status = 'pending';
CREATE INDEX scheduled_changes_project_status_idx ON scheduled_changes (project_id, status, scheduled_for);

-- Flag triggers: an inbound webhook. POSTing to the trigger's unguessable URL (the
-- token IS the auth) applies a fixed action to a flag in an environment.
CREATE TABLE flag_triggers (
    id               uuid PRIMARY KEY DEFAULT uuidv7(),
    project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id   uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    environment_key  text NOT NULL,
    flag_key         text NOT NULL,
    action           text NOT NULL, -- 'on' | 'off' (display); instructions carry the effect
    instructions     jsonb NOT NULL,
    token            text NOT NULL UNIQUE,
    description      text NOT NULL DEFAULT '',
    enabled          boolean NOT NULL DEFAULT true,
    exec_count       bigint NOT NULL DEFAULT 0,
    created_by       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_email text NOT NULL DEFAULT '',
    created_at       timestamptz NOT NULL DEFAULT now(),
    last_executed_at timestamptz
);
CREATE INDEX flag_triggers_project_idx ON flag_triggers (project_id, flag_key, environment_key);

-- Outbound webhooks: an organization registers a URL to receive signed POSTs when
-- events happen (an event is any audit entry whose action it subscribes to; '*' = all).
CREATE TABLE webhooks (
    id               uuid PRIMARY KEY DEFAULT uuidv7(),
    organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url              text NOT NULL,
    secret           text NOT NULL,
    event_types      text[] NOT NULL DEFAULT '{}', -- audit actions, or '*'
    description      text NOT NULL DEFAULT '',
    enabled          boolean NOT NULL DEFAULT true,
    created_by       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by_email text NOT NULL DEFAULT '',
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX webhooks_organization_idx ON webhooks (organization_id, created_at DESC);

-- The delivery queue + log: one row per (webhook, event), retried with backoff.
CREATE TABLE webhook_deliveries (
    id              uuid PRIMARY KEY DEFAULT uuidv7(),
    webhook_id      uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type      text NOT NULL,
    payload         jsonb NOT NULL,
    status          text NOT NULL DEFAULT 'pending', -- pending | success | failed
    attempts        integer NOT NULL DEFAULT 0,
    response_status integer NOT NULL DEFAULT 0,
    error           text NOT NULL DEFAULT '',
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),
    delivered_at    timestamptz
);
CREATE INDEX webhook_deliveries_due_idx     ON webhook_deliveries (next_attempt_at) WHERE status = 'pending';
CREATE INDEX webhook_deliveries_webhook_idx ON webhook_deliveries (webhook_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS
    webhook_deliveries, webhooks, flag_triggers, scheduled_changes, change_requests,
    contexts, flag_eval_stats, audit_log, segments, flag_environments, flags,
    role_assignments, role_permissions, roles, sdk_keys, environments, projects,
    memberships, organizations, users
    CASCADE;
DROP EXTENSION IF EXISTS citext;
