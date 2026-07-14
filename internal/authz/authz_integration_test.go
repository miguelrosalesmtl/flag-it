package authz_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/miguelrosalesmtl/flag-it/internal/authz"
	"github.com/miguelrosalesmtl/flag-it/internal/database"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/settings"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// TestAuthorizationResolution exercises the dynamic-role permission model against
// a real Postgres: seeded system roles (organization_admin/writer/reader), scope
// semantics, cross-organization isolation, and a custom per-organization role. Skipped when
// no database is reachable.
func TestAuthorizationResolution(t *testing.T) {
	ctx := context.Background()

	cfg, err := settings.Load()
	if err != nil {
		t.Skipf("settings unavailable: %v", err)
	}
	pool, err := database.NewPool(ctx, cfg.Postgres)
	if err != nil {
		t.Skipf("no database reachable: %v", err)
	}
	defer pool.Close()

	st := store.New(pool)
	az := authz.New(st)

	suffix := time.Now().UnixNano()
	email := func(name string) string { return fmt.Sprintf("%s-%d@test.local", name, suffix) }

	// Two organizations (each auto-seeds organization_admin/writer/reader roles).
	acme, err := st.CreateOrganization(ctx, fmt.Sprintf("acme-%d", suffix), "Acme")
	mustNoErr(t, err, "create acme")
	other, err := st.CreateOrganization(ctx, fmt.Sprintf("other-%d", suffix), "Other")
	mustNoErr(t, err, "create other")
	defer deleteOrganization(ctx, t, pool, acme.ID)
	defer deleteOrganization(ctx, t, pool, other.ID)

	projA, _, err := st.CreateProject(ctx, acme.ID, "app-a", "App A")
	mustNoErr(t, err, "create project A")
	projB, _, err := st.CreateProject(ctx, acme.ID, "app-b", "App B")
	mustNoErr(t, err, "create project B")

	// Users.
	super, err := st.CreateUser(ctx, email("super"), "x", "Super", true)
	mustNoErr(t, err, "create superuser")
	admin, err := st.CreateUser(ctx, email("admin"), "x", "Admin", false)
	mustNoErr(t, err, "create admin")
	writer, err := st.CreateUser(ctx, email("writer"), "x", "Writer", false)
	mustNoErr(t, err, "create writer")
	outsider, err := st.CreateUser(ctx, email("outsider"), "x", "Outsider", false)
	mustNoErr(t, err, "create outsider")
	for _, u := range []string{super.ID, admin.ID, writer.ID, outsider.ID} {
		defer deleteUser(ctx, t, pool, u)
	}

	// Grants via seeded roles.
	assignOrganizationRole(ctx, t, st, admin.ID, acme.ID, "organization_admin")
	assignProjectRole(ctx, t, st, writer.ID, acme.ID, projA.ID, "writer")           // writer on project A only
	assignOrganizationRole(ctx, t, st, outsider.ID, other.ID, "organization_admin") // admin of a different organization

	acmeProjA := models.Resource{OrganizationID: acme.ID, ProjectID: projA.ID}
	acmeProjB := models.Resource{OrganizationID: acme.ID, ProjectID: projB.ID}
	acmeOrganization := models.Resource{OrganizationID: acme.ID}

	cases := []struct {
		name    string
		userID  string
		perm    models.Permission
		res     models.Resource
		allowed bool
	}{
		{"superuser writes any project", super.ID, models.PermFlagWrite, acmeProjA, true},
		{"organization_admin writes project A", admin.ID, models.PermFlagWrite, acmeProjA, true},
		{"organization_admin writes project B (organization scope covers all)", admin.ID, models.PermFlagWrite, acmeProjB, true},
		{"organization_admin manages members", admin.ID, models.PermMemberManage, acmeOrganization, true},
		{"organization_admin manages sdk keys", admin.ID, models.PermSDKKeyManage, acmeOrganization, true},
		{"writer writes project A", writer.ID, models.PermFlagWrite, acmeProjA, true},
		{"writer reads project A", writer.ID, models.PermFlagRead, acmeProjA, true},
		{"writer CANNOT write project B", writer.ID, models.PermFlagWrite, acmeProjB, false},
		{"writer CANNOT manage members", writer.ID, models.PermMemberManage, acmeOrganization, false},
		{"writer CANNOT manage sdk keys", writer.ID, models.PermSDKKeyManage, acmeOrganization, false},
		{"outsider CANNOT read acme project", outsider.ID, models.PermFlagRead, acmeProjA, false},
		{"outsider CANNOT read acme organization", outsider.ID, models.PermOrganizationRead, acmeOrganization, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := az.Can(ctx, tc.userID, tc.perm, tc.res)
			mustNoErr(t, err, "authz.Can")
			if got != tc.allowed {
				t.Fatalf("Can(%s, %+v) = %v, want %v", tc.perm, tc.res, got, tc.allowed)
			}
		})
	}

	// --- Custom per-organization role: a project-scoped "releaser" that can manage SDK
	// keys. Proves dynamic role bundles work. ---
	releaser, err := st.CreateRole(ctx, acme.ID, "releaser", "Releaser", "Manage SDK keys",
		models.ScopeProject, []models.Permission{models.PermSDKKeyManage})
	mustNoErr(t, err, "create custom role")
	_, err = st.AssignProjectRole(ctx, writer.ID, releaser.ID, projA.ID)
	mustNoErr(t, err, "assign custom role")

	t.Run("custom role grants sdk_key.manage on project A only", func(t *testing.T) {
		okA, err := az.Can(ctx, writer.ID, models.PermSDKKeyManage, acmeProjA)
		mustNoErr(t, err, "can A")
		okB, err := az.Can(ctx, writer.ID, models.PermSDKKeyManage, acmeProjB)
		mustNoErr(t, err, "can B")
		if !okA || okB {
			t.Fatalf("custom role: got projA=%v projB=%v, want true/false", okA, okB)
		}
	})
}

func assignOrganizationRole(ctx context.Context, t *testing.T, st *store.Store, userID, organizationID, roleKey string) {
	t.Helper()
	role, err := st.GetRoleByKey(ctx, organizationID, roleKey)
	mustNoErr(t, err, "get role "+roleKey)
	_, err = st.AssignOrganizationRole(ctx, userID, role.ID, organizationID)
	mustNoErr(t, err, "assign organization role "+roleKey)
}

func assignProjectRole(ctx context.Context, t *testing.T, st *store.Store, userID, organizationID, projectID, roleKey string) {
	t.Helper()
	role, err := st.GetRoleByKey(ctx, organizationID, roleKey)
	mustNoErr(t, err, "get role "+roleKey)
	_, err = st.AssignProjectRole(ctx, userID, role.ID, projectID)
	mustNoErr(t, err, "assign project role "+roleKey)
}

func mustNoErr(t *testing.T, err error, ctx string) {
	t.Helper()
	if err != nil {
		t.Fatalf("%s: %v", ctx, err)
	}
}

func deleteOrganization(ctx context.Context, t *testing.T, pool *pgxpool.Pool, id string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `DELETE FROM organizations WHERE id = $1`, id); err != nil {
		t.Logf("cleanup organization %s: %v", id, err)
	}
}

func deleteUser(ctx context.Context, t *testing.T, pool *pgxpool.Pool, id string) {
	t.Helper()
	if _, err := pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, id); err != nil {
		t.Logf("cleanup user %s: %v", id, err)
	}
}
