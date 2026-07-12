-- +goose Up

-- Global user identities. A user may belong to many tenants via memberships.
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

-- Tenants are the isolated top-level accounts (LaunchDarkly "accounts").
CREATE TABLE tenants (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    slug       text NOT NULL UNIQUE,
    name       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- A user's link to a tenant, carrying their tenant-wide base role.
CREATE TABLE memberships (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('tenant_admin', 'member')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);

-- The unique index leads with user_id; index tenant_id for "list members of a
-- tenant" lookups.
CREATE INDEX memberships_tenant_id_idx ON memberships (tenant_id);

-- +goose Down
DROP TABLE memberships;
DROP TABLE tenants;
DROP TABLE users;
