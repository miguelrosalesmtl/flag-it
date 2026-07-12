package server

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/auth"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// Setup is the first-run bootstrap. A brand-new install has no superuser, so
// there is no way to log in and nothing that can create the first account —
// createsuperuser (CLI) is the only door. These two PUBLIC endpoints open a
// second door for the frontend's setup wizard, and slam it shut the moment a
// superuser exists so it can never be used to self-promote later.

type setupStatusOutput struct {
	Body struct {
		// NeedsSetup is true when no superuser exists yet (fresh install).
		NeedsSetup bool `json:"needs_setup"`
	}
}

type setupInput struct {
	Body struct {
		Email    string `json:"email" format:"email" doc:"first superuser's email"`
		Password string `json:"password" minLength:"8" doc:"first superuser's password"`
		FullName string `json:"full_name,omitempty" doc:"display name"`
		// Optionally create the first tenant in the same step. Both fields are
		// required together, or omit both to skip tenant creation.
		TenantSlug string `json:"tenant_slug,omitempty" doc:"first tenant's url slug"`
		TenantName string `json:"tenant_name,omitempty" doc:"first tenant's display name"`
	}
}

type setupOutput struct {
	Body struct {
		Token  string         `json:"token"`
		User   models.User    `json:"user"`
		Tenant *models.Tenant `json:"tenant,omitempty"`
	}
}

func (s *Server) registerSetup() {
	// GET /setup — public status probe the wizard hits on boot. No auth: a
	// fresh install has no credentials to authenticate with.
	huma.Register(s.api, huma.Operation{
		OperationID: "setup-status", Method: http.MethodGet, Path: "/api/v1/setup",
		Summary: "Whether the install still needs first-run setup", Tags: []string{"Setup"},
	}, func(ctx context.Context, _ *struct{}) (*setupStatusOutput, error) {
		n, err := s.store.CountSuperusers(ctx)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &setupStatusOutput{}
		out.Body.NeedsSetup = n == 0
		return out, nil
	})

	// POST /setup — one-time bootstrap. Creates the first superuser (and
	// optionally the first tenant) and returns a token so the wizard lands the
	// user straight in the app. 409 once any superuser exists.
	huma.Register(s.api, huma.Operation{
		OperationID: "setup", Method: http.MethodPost, Path: "/api/v1/setup",
		Summary:       "Create the first superuser and tenant (one-time, fresh install only)",
		Tags:          []string{"Setup"},
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *setupInput) (*setupOutput, error) {
		// Input-shape validation stays at the edge; the workflow itself (the
		// "already complete" invariant, atomic user+tenant creation, token
		// issuance) lives in auth.Bootstrap.
		if (in.Body.TenantSlug == "") != (in.Body.TenantName == "") {
			return nil, huma.Error400BadRequest("tenant_slug and tenant_name must be provided together")
		}

		res, err := s.auth.Bootstrap(ctx, auth.BootstrapInput{
			Email:      in.Body.Email,
			Password:   in.Body.Password,
			FullName:   in.Body.FullName,
			TenantSlug: in.Body.TenantSlug,
			TenantName: in.Body.TenantName,
		})
		if errors.Is(err, auth.ErrSetupComplete) {
			return nil, huma.Error409Conflict("setup already complete")
		}
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}

		out := &setupOutput{}
		out.Body.User = res.User
		out.Body.Tenant = res.Tenant
		out.Body.Token = res.Token

		// Attribute the audit trail to the just-created superuser; there is no
		// request-context actor on a public endpoint.
		if res.Tenant != nil {
			s.auditAs(ctx, res.User, models.AuditEntry{TenantID: res.Tenant.ID,
				Action: "tenant.created", ResourceType: "tenant", ResourceKey: res.Tenant.Slug})
		}
		s.auditAs(ctx, res.User, models.AuditEntry{
			Action: "setup.completed", ResourceType: "user", ResourceKey: res.User.Email})
		return out, nil
	})
}
