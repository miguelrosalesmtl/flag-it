package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/governance"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type createChangeInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
	EnvKey     string `path:"envKey"`
	Body       struct {
		Comment      string              `json:"comment,omitempty" doc:"why this change is proposed"`
		Instructions []flags.Instruction `json:"instructions"`
	}
}

type listChangesInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	Status     string `query:"status" doc:"filter by status: pending, approved, or rejected"`
}

type reviewChangeInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	ChangeID   string `path:"changeId"`
	Body       struct {
		Comment string `json:"comment,omitempty" doc:"reviewer note"`
	}
}

type changeOutput struct {
	Body models.ChangeRequest
}

type listChangesOutput struct {
	Body struct {
		Changes []models.ChangeRequest `json:"changes"`
	}
}

func (s *Server) registerChanges() {
	base := "/api/v1/tenants/{tenantSlug}/projects/{projectKey}"

	huma.Register(s.api, huma.Operation{
		OperationID: "create-change-request", Method: http.MethodPost,
		Path:    base + "/flags/{flagKey}/environments/{envKey}/changes",
		Summary: "Propose a flag change for review (requires flag.read)",
		Description: "Records a set of semantic instructions as a pending change request. " +
			"The change is applied only when a reviewer approves it.",
		Tags: []string{"Approvals"}, Security: bearer,
	}, func(ctx context.Context, in *createChangeInput) (*changeOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		// Proposing needs only read: the point of approvals is that the proposer
		// may not have write. Applying (approve) requires flag.write below.
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if len(in.Body.Instructions) == 0 {
			return nil, huma.Error400BadRequest("at least one instruction is required")
		}
		flag, err := s.flags.GetFlag(ctx, project.ID, in.FlagKey)
		if err != nil {
			return nil, storeError(err, "flag not found")
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}
		instructions, err := json.Marshal(in.Body.Instructions)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid instructions")
		}
		user, err := s.auth.GetUser(ctx, userID(ctx))
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		cr, err := s.governance.Create(ctx, models.ChangeRequest{
			ProjectID:        project.ID,
			EnvironmentID:    env.ID,
			EnvironmentKey:   env.Key,
			FlagKey:          flag.Key,
			Instructions:     instructions,
			Comment:          in.Body.Comment,
			RequestedBy:      user.ID,
			RequestedByEmail: user.Email,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "change.requested", ResourceType: "flag", ResourceKey: flag.Key,
			Comment: in.Body.Comment,
			Data:    jsonData(map[string]any{"environment": env.Key, "change_request": cr.ID})})
		return &changeOutput{Body: cr}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-change-requests", Method: http.MethodGet,
		Path:    base + "/changes",
		Summary: "List a project's change requests (requires flag.read)",
		Tags:    []string{"Approvals"}, Security: bearer,
	}, func(ctx context.Context, in *listChangesInput) (*listChangesOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if in.Status != "" && in.Status != models.ChangeStatusPending &&
			in.Status != models.ChangeStatusApproved && in.Status != models.ChangeStatusRejected {
			return nil, huma.Error400BadRequest("invalid status filter")
		}
		list, err := s.governance.List(ctx, project.ID, in.Status)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listChangesOutput{}
		out.Body.Changes = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "approve-change-request", Method: http.MethodPost,
		Path:    base + "/changes/{changeId}/approve",
		Summary: "Approve a change request and apply it (requires flag.write)",
		Tags:    []string{"Approvals"}, Security: bearer,
	}, func(ctx context.Context, in *reviewChangeInput) (*changeOutput, error) {
		return s.reviewChange(ctx, in, true)
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "reject-change-request", Method: http.MethodPost,
		Path:    base + "/changes/{changeId}/reject",
		Summary: "Reject a change request without applying it (requires flag.write)",
		Tags:    []string{"Approvals"}, Security: bearer,
	}, func(ctx context.Context, in *reviewChangeInput) (*changeOutput, error) {
		return s.reviewChange(ctx, in, false)
	})
}

// reviewChange is the shared approve/reject path: it authorizes, verifies the
// request belongs to the project, applies the review, and audits.
func (s *Server) reviewChange(ctx context.Context, in *reviewChangeInput, approve bool) (*changeOutput, error) {
	_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
	if err != nil {
		return nil, err
	}
	if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
		return nil, err
	}
	existing, err := s.governance.Get(ctx, in.ChangeID)
	if err != nil {
		return nil, storeError(err, "change request not found")
	}
	if existing.ProjectID != project.ID {
		return nil, huma.Error404NotFound("change request not found")
	}
	user, err := s.auth.GetUser(ctx, userID(ctx))
	if err != nil {
		return nil, huma.Error500InternalServerError(err.Error())
	}

	var cr models.ChangeRequest
	action := "change.rejected"
	if approve {
		action = "change.approved"
		cr, err = s.governance.Approve(ctx, in.ChangeID, user.ID, user.Email, in.Body.Comment)
	} else {
		cr, err = s.governance.Reject(ctx, in.ChangeID, user.ID, user.Email, in.Body.Comment)
	}
	if err != nil {
		return nil, changeError(err)
	}
	s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
		Action: action, ResourceType: "flag", ResourceKey: cr.FlagKey,
		Comment: in.Body.Comment,
		Data:    jsonData(map[string]any{"environment": cr.EnvironmentKey, "change_request": cr.ID})})
	return &changeOutput{Body: cr}, nil
}

// changeError maps governance errors to HTTP statuses.
func changeError(err error) error {
	if errors.Is(err, governance.ErrNotPending) {
		return huma.Error409Conflict("change request is not pending")
	}
	return flagError(err)
}
