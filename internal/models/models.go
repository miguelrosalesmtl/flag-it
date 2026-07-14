// Package models holds the plain domain types shared across the service. It has
// no database or transport dependencies so it can be imported freely, including
// by the pure authorization logic in authz.go.
package models

import "time"

// User is a global identity. It may belong to many organizations via memberships.
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	IsSuperuser  bool      `json:"is_superuser"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Organization is an isolated top-level account.
type Organization struct {
	ID        string    `json:"id"`
	Slug      string    `json:"slug"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Membership records that a user belongs to a organization. Permissions come from
// role assignments, not from membership — membership is belonging only.
type Membership struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	OrganizationID string    `json:"organization_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Role is a per-organization, named bundle of permissions. System roles (organization_admin,
// writer, reader) are seeded per organization; organizations may define their own.
type Role struct {
	ID             string       `json:"id"`
	OrganizationID string       `json:"organization_id"`
	Key            string       `json:"key"`
	Name           string       `json:"name"`
	Description    string       `json:"description"`
	Scope          ScopeType    `json:"scope"` // where the role is assignable
	IsSystem       bool         `json:"is_system"`
	Permissions    []Permission `json:"permissions"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

// RoleAssignment grants a user a role at a scope (a organization, or one project).
// Exactly one of OrganizationID / ProjectID is set, matching ScopeType.
type RoleAssignment struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	RoleID         string    `json:"role_id"`
	ScopeType      ScopeType `json:"scope_type"`
	OrganizationID *string   `json:"organization_id,omitempty"`
	ProjectID      *string   `json:"project_id,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// PermissionGrant is a flattened (scope, permission) a user holds, used to build
// a Subject.
type PermissionGrant struct {
	ScopeType      ScopeType
	OrganizationID string // set when ScopeType == ScopeOrganization
	ProjectID      string // set when ScopeType == ScopeProject
	Permission     Permission
}

// Project is an application within a organization.
type Project struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Key            string    `json:"key"`
	Name           string    `json:"name"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Environment is a deployment target within a project (production, staging, …).
type Environment struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Key       string    `json:"key"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SdkKey authenticates a client and identifies which environment it evaluates
// against.
type SdkKey struct {
	ID            string     `json:"id"`
	EnvironmentID string     `json:"environment_id"`
	Key           string     `json:"key"`
	Kind          string     `json:"kind"` // "server" | "client"
	Name          string     `json:"name"`
	LastUsedAt    *time.Time `json:"last_used_at,omitempty"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}
