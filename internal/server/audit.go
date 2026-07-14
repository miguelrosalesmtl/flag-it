package server

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/audit"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// audit records a change attributed to the request-context user, best-effort.
func (s *Server) audit(ctx context.Context, e models.AuditEntry) {
	s.auditSvc.Record(ctx, userID(ctx), e)
}

// auditAs records a change attributed to an explicit actor, for public
// endpoints (e.g. first-run setup) with no authenticated principal in context.
func (s *Server) auditAs(ctx context.Context, actor models.User, e models.AuditEntry) {
	s.auditSvc.RecordAs(ctx, actor, e)
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
	OrganizationSlug string `path:"organizationSlug"`
	Limit            int    `query:"limit" doc:"max entries (default 50, max 200)"`
	ProjectID        string `query:"project_id" doc:"filter by project UUID"`
	ResourceType     string `query:"resource_type" doc:"e.g. flag, segment, sdk_key, role"`
	ResourceKey      string `query:"resource_key"`
	Before           string `query:"before" doc:"id cursor: return entries older than this id"`
}

type listAuditOutput struct {
	Body struct {
		Entries []models.AuditEntry `json:"entries"`
	}
}

func (s *Server) registerAudit() {
	huma.Register(s.api, huma.Operation{
		OperationID: "list-audit", Method: http.MethodGet, Path: "/api/v1/organizations/{organizationSlug}/audit",
		Summary: "List a organization's change history (requires audit.read)", Tags: []string{"Audit"}, Security: bearer,
	}, func(ctx context.Context, in *listAuditInput) (*listAuditOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermAuditRead, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		entries, err := s.auditSvc.List(ctx, organization.ID, audit.ListParams{
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
