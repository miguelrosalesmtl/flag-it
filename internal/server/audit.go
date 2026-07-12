package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// audit records a change, best-effort. The actor is taken from the request
// context; a failure is logged but never fails the underlying operation. (A
// future refinement could write this in the same transaction as the change.)
func (s *Server) audit(ctx context.Context, e models.AuditEntry) {
	e.ActorID = userID(ctx)
	if e.ActorID != "" {
		if u, err := s.store.GetUserByID(ctx, e.ActorID); err == nil {
			e.ActorEmail = u.Email
		}
	}
	if err := s.store.CreateAuditEntry(ctx, e); err != nil {
		s.log.Warn("audit: record failed",
			slog.String("action", e.Action), slog.String("error", err.Error()))
	}
}

// jsonData marshals detail for an audit entry's data field.
func jsonData(v any) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	return b
}

type listAuditInput struct {
	TenantSlug   string `path:"tenantSlug"`
	Limit        int    `query:"limit" doc:"max entries (default 50, max 200)"`
	ProjectID    string `query:"project_id" doc:"filter by project UUID"`
	ResourceType string `query:"resource_type" doc:"e.g. flag, segment, sdk_key, role"`
	ResourceKey  string `query:"resource_key"`
	Before       string `query:"before" doc:"id cursor: return entries older than this id"`
}

type listAuditOutput struct {
	Body struct {
		Entries []models.AuditEntry `json:"entries"`
	}
}

func (s *Server) registerAudit() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-audit", Method: http.MethodGet, Path: "/api/v1/tenants/{tenantSlug}/audit",
		Summary: "List a tenant's change history (requires audit.read)", Tags: []string{"Audit"}, Security: bearer,
	}, func(ctx context.Context, in *listAuditInput) (*listAuditOutput, error) {
		tenant, err := s.resolveTenant(ctx, in.TenantSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermAuditRead, models.Resource{TenantID: tenant.ID}); err != nil {
			return nil, err
		}
		entries, err := s.store.ListAuditEntries(ctx, tenant.ID, store.AuditFilter{
			ProjectID:    in.ProjectID,
			ResourceType: in.ResourceType,
			ResourceKey:  in.ResourceKey,
			Before:       in.Before,
			Limit:        in.Limit,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listAuditOutput{}
		out.Body.Entries = entries
		return out, nil
	})
}
