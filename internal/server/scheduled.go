package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type createScheduledInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
	EnvKey     string `path:"envKey"`
	Body       struct {
		Comment      string              `json:"comment,omitempty" doc:"why this change is scheduled"`
		ScheduledFor time.Time           `json:"scheduled_for" doc:"when to apply the change (RFC3339)"`
		Instructions []flags.Instruction `json:"instructions"`
	}
}

type listScheduledInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	Status     string `query:"status" doc:"filter by status: pending, applied, cancelled, or failed"`
	Flag       string `query:"flag" doc:"filter by flag key"`
	Env        string `query:"env" doc:"filter by environment key"`
}

type cancelScheduledInput struct {
	TenantSlug  string `path:"tenantSlug"`
	ProjectKey  string `path:"projectKey"`
	ScheduledID string `path:"scheduledId"`
}

type scheduledOutput struct {
	Body models.ScheduledChange
}

type listScheduledOutput struct {
	Body struct {
		ScheduledChanges []models.ScheduledChange `json:"scheduled_changes"`
	}
}

func (s *Server) registerScheduled() {
	base := "/api/v1/tenants/{tenantSlug}/projects/{projectKey}"

	huma.Register(s.api, huma.Operation{
		OperationID: "create-scheduled-change", Method: http.MethodPost,
		Path:    base + "/flags/{flagKey}/environments/{envKey}/scheduled-changes",
		Summary: "Schedule a flag change to apply at a future time (requires flag.write)",
		Description: "Records semantic instructions to be applied automatically once " +
			"scheduled_for passes. Cancel it before then to prevent it.",
		Tags: []string{"Scheduled changes"}, Security: bearer,
	}, func(ctx context.Context, in *createScheduledInput) (*scheduledOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if len(in.Body.Instructions) == 0 {
			return nil, huma.Error400BadRequest("at least one instruction is required")
		}
		if !in.Body.ScheduledFor.After(time.Now()) {
			return nil, huma.Error400BadRequest("scheduled_for must be in the future")
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
		sc, err := s.governance.Schedule(ctx, models.ScheduledChange{
			ProjectID:      project.ID,
			EnvironmentID:  env.ID,
			EnvironmentKey: env.Key,
			FlagKey:        flag.Key,
			Instructions:   instructions,
			Comment:        in.Body.Comment,
			ScheduledFor:   in.Body.ScheduledFor,
			CreatedBy:      user.ID,
			CreatedByEmail: user.Email,
		})
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "change.scheduled", ResourceType: "flag", ResourceKey: flag.Key,
			Comment: in.Body.Comment,
			Data: jsonData(map[string]any{
				"environment": env.Key, "scheduled_change": sc.ID, "scheduled_for": sc.ScheduledFor})})
		return &scheduledOutput{Body: sc}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-scheduled-changes", Method: http.MethodGet,
		Path:    base + "/scheduled-changes",
		Summary: "List a project's scheduled changes (requires flag.read)",
		Tags:    []string{"Scheduled changes"}, Security: bearer,
	}, func(ctx context.Context, in *listScheduledInput) (*listScheduledOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		if in.Status != "" && in.Status != models.ScheduledStatusPending &&
			in.Status != models.ScheduledStatusApplied && in.Status != models.ScheduledStatusCancelled &&
			in.Status != models.ScheduledStatusFailed {
			return nil, huma.Error400BadRequest("invalid status filter")
		}
		list, err := s.governance.ListScheduled(ctx, project.ID, in.Status, in.Flag, in.Env)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listScheduledOutput{}
		out.Body.ScheduledChanges = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "cancel-scheduled-change", Method: http.MethodPost,
		Path:    base + "/scheduled-changes/{scheduledId}/cancel",
		Summary: "Cancel a pending scheduled change (requires flag.write)",
		Tags:    []string{"Scheduled changes"}, Security: bearer,
	}, func(ctx context.Context, in *cancelScheduledInput) (*scheduledOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		existing, err := s.governance.GetScheduled(ctx, in.ScheduledID)
		if err != nil {
			return nil, storeError(err, "scheduled change not found")
		}
		if existing.ProjectID != project.ID {
			return nil, huma.Error404NotFound("scheduled change not found")
		}
		sc, err := s.governance.CancelScheduled(ctx, in.ScheduledID)
		if err != nil {
			return nil, storeError(err, "scheduled change not found or already resolved")
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "change.schedule.cancelled", ResourceType: "flag", ResourceKey: sc.FlagKey,
			Data: jsonData(map[string]any{"environment": sc.EnvironmentKey, "scheduled_change": sc.ID})})
		return &scheduledOutput{Body: sc}, nil
	})
}
