package models

// Permission is a single capability in the fixed vocabulary. Roles (data in the
// DB) are bundles of these. Handlers check a Permission, never a raw role name,
// so the role→permission mapping can evolve from code defaults to DB-defined
// custom roles (and later a full policy engine) without touching call sites.
type Permission string

const (
	PermTenantRead   Permission = "tenant.read"
	PermTenantUpdate Permission = "tenant.update"
	PermMemberManage Permission = "member.manage" // invite/remove members, assign roles
	PermRoleManage   Permission = "role.manage"   // create/edit/delete custom roles
	PermAuditRead    Permission = "audit.read"    // view the change history

	PermProjectCreate Permission = "project.create"
	PermProjectRead   Permission = "project.read"
	PermProjectUpdate Permission = "project.update"
	PermProjectDelete Permission = "project.delete"

	PermEnvironmentManage Permission = "environment.manage"
	PermSDKKeyManage      Permission = "sdk_key.manage"

	PermFlagRead   Permission = "flag.read"
	PermFlagWrite  Permission = "flag.write"
	PermFlagDelete Permission = "flag.delete"
)

// AllPermissions is the complete vocabulary (the tenant_admin bundle).
var AllPermissions = []Permission{
	PermTenantRead, PermTenantUpdate, PermMemberManage, PermRoleManage, PermAuditRead,
	PermProjectCreate, PermProjectRead, PermProjectUpdate, PermProjectDelete,
	PermEnvironmentManage, PermSDKKeyManage,
	PermFlagRead, PermFlagWrite, PermFlagDelete,
}

var permissionSet = func() map[Permission]bool {
	m := make(map[Permission]bool, len(AllPermissions))
	for _, p := range AllPermissions {
		m[p] = true
	}
	return m
}()

// IsValidPermission reports whether p is part of the vocabulary.
func IsValidPermission(p Permission) bool { return permissionSet[p] }

// ScopeType is where a role is assignable / an assignment applies.
type ScopeType string

const (
	ScopeTenant  ScopeType = "tenant"
	ScopeProject ScopeType = "project"
)

// Resource identifies what an action targets. ProjectID is empty for
// tenant-level resources.
type Resource struct {
	TenantID  string
	ProjectID string
}

// Subject is a user's precomputed authorization profile: superuser status plus
// the set of permissions they hold at each tenant and project scope. Build once
// per request (see authz.Service) and answer many Can checks cheaply.
//
// A tenant-scoped grant applies to the tenant AND every project within it; a
// project-scoped grant applies only to that project.
type Subject struct {
	UserID       string
	IsSuperuser  bool
	TenantPerms  map[string]map[Permission]bool // tenantID  -> perms
	ProjectPerms map[string]map[Permission]bool // projectID -> perms
}

// Can reports whether the subject may perform perm on res.
func (s Subject) Can(perm Permission, res Resource) bool {
	if s.IsSuperuser {
		return true
	}
	if res.TenantID != "" && s.TenantPerms[res.TenantID][perm] {
		return true
	}
	if res.ProjectID != "" && s.ProjectPerms[res.ProjectID][perm] {
		return true
	}
	return false
}
