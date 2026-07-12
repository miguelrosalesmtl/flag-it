-- +goose Up
-- Authz v2: replace the hardcoded role model (memberships.role + project_roles)
-- with per-tenant, dynamic roles = named bundles of permissions, plus scoped
-- assignments. Memberships become belonging-only.

ALTER TABLE memberships DROP COLUMN role;
DROP TABLE project_roles;

-- A role is a per-tenant bundle of permissions, assignable at one scope.
CREATE TABLE roles (
    id          uuid PRIMARY KEY DEFAULT uuidv7(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key         text NOT NULL,
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    scope       text NOT NULL CHECK (scope IN ('tenant', 'project')),
    is_system   boolean NOT NULL DEFAULT false,   -- seeded defaults; not deletable
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, key)
);

-- The permissions a role grants (from the code vocabulary).
CREATE TABLE role_permissions (
    role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission text NOT NULL,
    PRIMARY KEY (role_id, permission)
);

-- A user holds a role at a scope: a tenant (covers all its projects) or one
-- project. Exactly one of tenant_id / project_id is set, matching scope_type.
CREATE TABLE role_assignments (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope_type text NOT NULL CHECK (scope_type IN ('tenant', 'project')),
    tenant_id  uuid REFERENCES tenants(id)  ON DELETE CASCADE,
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (
        (scope_type = 'tenant'  AND tenant_id  IS NOT NULL AND project_id IS NULL) OR
        (scope_type = 'project' AND project_id IS NOT NULL AND tenant_id  IS NULL)
    ),
    -- NULLS NOT DISTINCT (PG15+) so the null scope column doesn't defeat the
    -- uniqueness of an assignment.
    UNIQUE NULLS NOT DISTINCT (user_id, role_id, tenant_id, project_id)
);

CREATE INDEX role_assignments_user_id_idx    ON role_assignments (user_id);
CREATE INDEX role_assignments_tenant_id_idx  ON role_assignments (tenant_id);
CREATE INDEX role_assignments_project_id_idx ON role_assignments (project_id);

-- +goose Down
DROP TABLE role_assignments;
DROP TABLE role_permissions;
DROP TABLE roles;

ALTER TABLE memberships ADD COLUMN role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('tenant_admin', 'member'));

CREATE TABLE project_roles (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('writer', 'reader')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, project_id)
);
CREATE INDEX project_roles_project_id_idx ON project_roles (project_id);
