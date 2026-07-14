package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/governance"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// triggerBody is a trigger plus its fire URL. The URL/token are present only in
// create/reset responses (the token is a write-capable secret shown once).
type triggerBody struct {
	models.FlagTrigger
	URL string `json:"url,omitempty" doc:"the webhook URL to POST to; shown once on create/reset"`
}

type createTriggerInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	FlagKey          string `path:"flagKey"`
	EnvKey           string `path:"envKey"`
	Body             struct {
		Action      string `json:"action" enum:"on,off" doc:"what firing the webhook does"`
		Description string `json:"description,omitempty" doc:"e.g. the integration that fires it"`
	}
}

type listTriggersInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	Flag             string `query:"flag" doc:"filter by flag key"`
	Env              string `query:"env" doc:"filter by environment key"`
}

type triggerIDInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	TriggerID        string `path:"triggerId"`
}

type setTriggerEnabledInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	TriggerID        string `path:"triggerId"`
	Body             struct {
		Enabled bool `json:"enabled"`
	}
}

type triggerOutput struct {
	Body triggerBody
}

type listTriggersOutput struct {
	Body struct {
		Triggers []models.FlagTrigger `json:"triggers"`
	}
}

// fireTriggerInput authenticates purely by the URL token (no bearer/SDK key).
type fireTriggerInput struct {
	Token string `path:"token"`
}

type fireTriggerOutput struct {
	Body struct {
		FlagKey     string `json:"flag_key"`
		Environment string `json:"environment"`
		Action      string `json:"action"`
		Status      string `json:"status"`
	}
}

// triggerURL builds the public webhook URL for a token.
func (s *Server) triggerURL(token string) string {
	return fmt.Sprintf("%s/api/v1/triggers/%s", s.config.PublicBaseURL(), token)
}

func (s *Server) registerTriggers() {
	base := "/api/v1/organizations/{organizationSlug}/projects/{projectKey}"

	huma.Register(s.api, huma.Operation{
		OperationID: "create-trigger", Method: http.MethodPost,
		Path:    base + "/flags/{flagKey}/environments/{envKey}/triggers",
		Summary: "Create a flag trigger webhook (requires flag.write)",
		Description: "Returns a one-time URL. POST to it (no auth — the token is the credential) " +
			"to apply the action. The URL is shown only on create and reset.",
		Tags: []string{"Triggers"}, Security: bearer,
	}, func(ctx context.Context, in *createTriggerInput) (*triggerOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		flag, err := s.flags.GetFlag(ctx, project.ID, in.FlagKey)
		if err != nil {
			return nil, storeError(err, "flag not found")
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}
		user, err := s.auth.GetUser(ctx, userID(ctx))
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		t, err := s.governance.CreateTrigger(ctx, governance.TriggerInput{
			ProjectID:      project.ID,
			EnvironmentID:  env.ID,
			EnvironmentKey: env.Key,
			FlagKey:        flag.Key,
			Action:         in.Body.Action,
			Description:    in.Body.Description,
			CreatedBy:      user.ID,
			CreatedByEmail: user.Email,
		})
		if err != nil {
			return nil, triggerError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "trigger.created", ResourceType: "flag", ResourceKey: flag.Key,
			Data: jsonData(map[string]any{"environment": env.Key, "trigger": t.ID, "trigger_action": t.Action})})
		return &triggerOutput{Body: triggerBody{FlagTrigger: t, URL: s.triggerURL(t.Token)}}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-triggers", Method: http.MethodGet, Path: base + "/triggers",
		Summary: "List a project's flag triggers, without their secret URLs (requires flag.read)",
		Tags:    []string{"Triggers"}, Security: bearer,
	}, func(ctx context.Context, in *listTriggersInput) (*listTriggersOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		list, err := s.governance.ListTriggers(ctx, project.ID, in.Flag, in.Env)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		for i := range list {
			list[i].Token = "" // never re-expose the secret in a list
		}
		out := &listTriggersOutput{}
		out.Body.Triggers = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "set-trigger-enabled", Method: http.MethodPost,
		Path:    base + "/triggers/{triggerId}/enabled",
		Summary: "Enable or disable a flag trigger (requires flag.write)",
		Tags:    []string{"Triggers"}, Security: bearer,
	}, func(ctx context.Context, in *setTriggerEnabledInput) (*triggerOutput, error) {
		project, t, err := s.resolveTrigger(ctx, in.OrganizationSlug, in.ProjectKey, in.TriggerID)
		if err != nil {
			return nil, err
		}
		updated, err := s.governance.SetTriggerEnabled(ctx, t.ID, in.Body.Enabled)
		if err != nil {
			return nil, triggerError(err)
		}
		action := "trigger.disabled"
		if in.Body.Enabled {
			action = "trigger.enabled"
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: action, ResourceType: "flag", ResourceKey: t.FlagKey,
			Data: jsonData(map[string]any{"environment": t.EnvironmentKey, "trigger": t.ID})})
		updated.Token = ""
		return &triggerOutput{Body: triggerBody{FlagTrigger: updated}}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "reset-trigger", Method: http.MethodPost,
		Path:    base + "/triggers/{triggerId}/reset",
		Summary: "Reset a trigger's URL token, invalidating the old URL (requires flag.write)",
		Tags:    []string{"Triggers"}, Security: bearer,
	}, func(ctx context.Context, in *triggerIDInput) (*triggerOutput, error) {
		project, t, err := s.resolveTrigger(ctx, in.OrganizationSlug, in.ProjectKey, in.TriggerID)
		if err != nil {
			return nil, err
		}
		updated, err := s.governance.ResetTriggerToken(ctx, t.ID)
		if err != nil {
			return nil, triggerError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "trigger.reset", ResourceType: "flag", ResourceKey: t.FlagKey,
			Data: jsonData(map[string]any{"environment": t.EnvironmentKey, "trigger": t.ID})})
		return &triggerOutput{Body: triggerBody{FlagTrigger: updated, URL: s.triggerURL(updated.Token)}}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-trigger", Method: http.MethodDelete,
		Path:    base + "/triggers/{triggerId}",
		Summary: "Delete a flag trigger (requires flag.write)",
		Tags:    []string{"Triggers"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *triggerIDInput) (*noContent, error) {
		project, t, err := s.resolveTrigger(ctx, in.OrganizationSlug, in.ProjectKey, in.TriggerID)
		if err != nil {
			return nil, err
		}
		if err := s.governance.DeleteTrigger(ctx, t.ID); err != nil {
			return nil, triggerError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "trigger.deleted", ResourceType: "flag", ResourceKey: t.FlagKey,
			Data: jsonData(map[string]any{"environment": t.EnvironmentKey, "trigger": t.ID})})
		return &noContent{}, nil
	})

	// Public fire endpoint — no bearer/SDK auth; the URL token is the credential.
	huma.Register(s.api, huma.Operation{
		OperationID: "fire-trigger", Method: http.MethodPost, Path: "/api/v1/triggers/{token}",
		Summary:     "Fire a flag trigger (authenticated by the URL token only)",
		Description: "POST here — typically from an alerting or CI system — to apply the trigger's action.",
		Tags:        []string{"Triggers"},
	}, func(ctx context.Context, in *fireTriggerInput) (*fireTriggerOutput, error) {
		t, err := s.governance.Fire(ctx, in.Token)
		if err != nil {
			return nil, triggerError(err)
		}
		s.recordTriggerAudit(ctx, t)
		out := &fireTriggerOutput{}
		out.Body.FlagKey = t.FlagKey
		out.Body.Environment = t.EnvironmentKey
		out.Body.Action = t.Action
		out.Body.Status = "applied"
		return out, nil
	})
}

// resolveTrigger resolves the project + a trigger, enforcing that the trigger
// belongs to that project. Requires flag.write (all mutating trigger ops do).
func (s *Server) resolveTrigger(ctx context.Context, organizationSlug, projectKey, triggerID string) (models.Project, models.FlagTrigger, error) {
	_, project, err := s.resolveScope(ctx, organizationSlug, projectKey)
	if err != nil {
		return models.Project{}, models.FlagTrigger{}, err
	}
	if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
		return models.Project{}, models.FlagTrigger{}, err
	}
	t, err := s.governance.GetTrigger(ctx, triggerID)
	if err != nil {
		return models.Project{}, models.FlagTrigger{}, storeError(err, "trigger not found")
	}
	if t.ProjectID != project.ID {
		return models.Project{}, models.FlagTrigger{}, huma.Error404NotFound("trigger not found")
	}
	return project, t, nil
}

// recordTriggerAudit records a fire. The actor is the trigger itself (the fire is
// unauthenticated), so the organization is resolved from the trigger's project.
func (s *Server) recordTriggerAudit(ctx context.Context, t models.FlagTrigger) {
	project, err := s.catalog.ProjectByID(ctx, t.ProjectID)
	if err != nil {
		s.log.Warn("trigger audit: project lookup failed", "error", err)
		return
	}
	s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
		Action: "trigger.fired", ResourceType: "flag", ResourceKey: t.FlagKey,
		Data: jsonData(map[string]any{"environment": t.EnvironmentKey, "trigger": t.ID, "trigger_action": t.Action})})
}

// triggerError maps governance/store errors to HTTP statuses.
func triggerError(err error) error {
	switch {
	case errors.Is(err, governance.ErrInvalidAction):
		return huma.Error400BadRequest(err.Error())
	case errors.Is(err, governance.ErrTriggerDisabled):
		return huma.Error409Conflict("trigger is disabled")
	default:
		return flagError(err)
	}
}
