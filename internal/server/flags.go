package server

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type listFlagsOutput struct {
	Body struct {
		Flags []models.Flag `json:"flags"`
	}
}

// flagInEnv is a flag definition plus its on/off state in one environment.
type flagInEnv struct {
	models.Flag
	On bool `json:"on"`
}

type listEnvFlagsOutput struct {
	Body struct {
		Flags []flagInEnv `json:"flags"`
	}
}

type saveFlagInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
	Body       struct {
		Name                string            `json:"name,omitempty"`
		Description         string            `json:"description,omitempty"`
		ClientSideAvailable bool              `json:"client_side_available,omitempty" doc:"expose to client (public) SDK keys; default false = server-only"`
		Variations          []json.RawMessage `json:"variations"`
	}
}

type flagOutput struct {
	Body models.Flag
}

type flagPath struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
}

// flagConfigPath addresses a flag's config in one environment.
type flagConfigPath struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
	EnvKey     string `path:"envKey"`
}

type saveFlagConfigInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
	EnvKey     string `path:"envKey"`
	Body       struct {
		On            bool                      `json:"on"`
		OffVariation  int                       `json:"off_variation"`
		Prerequisites []models.Prerequisite     `json:"prerequisites,omitempty"`
		Targets       []models.Target           `json:"targets,omitempty"`
		Rules         []models.Rule             `json:"rules,omitempty"`
		Fallthrough   models.VariationOrRollout `json:"fallthrough"`
	}
}

type flagConfigOutput struct {
	Body models.FlagConfig
}

type patchFlagConfigInput struct {
	TenantSlug string `path:"tenantSlug"`
	ProjectKey string `path:"projectKey"`
	FlagKey    string `path:"flagKey"`
	EnvKey     string `path:"envKey"`
	Body       struct {
		Comment      string              `json:"comment,omitempty" doc:"optional note recorded in the audit log"`
		Instructions []flags.Instruction `json:"instructions"`
	}
}

func (s *Server) registerFlags() {
	base := "/api/v1/tenants/{tenantSlug}/projects/{projectKey}"

	huma.Register(s.api, huma.Operation{
		OperationID: "list-flags", Method: http.MethodGet, Path: base + "/flags",
		Summary: "List a project's flag definitions (requires flag.read)", Tags: []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *projectPath) (*listFlagsOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		list, err := s.flags.ListFlags(ctx, project.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listFlagsOutput{}
		out.Body.Flags = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-env-flags", Method: http.MethodGet,
		Path:    base + "/environments/{envKey}/flags",
		Summary: "List a project's flags with their on/off state in one environment (requires flag.read)",
		Tags:    []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *envKeyPath) (*listEnvFlagsOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}
		list, err := s.flags.ListFlags(ctx, project.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		states, err := s.flags.FlagOnStates(ctx, project.ID, env.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listEnvFlagsOutput{}
		out.Body.Flags = make([]flagInEnv, 0, len(list))
		for _, f := range list {
			out.Body.Flags = append(out.Body.Flags, flagInEnv{Flag: f, On: states[f.ID]})
		}
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-flag", Method: http.MethodGet, Path: base + "/flags/{flagKey}",
		Summary: "Get a flag definition (requires flag.read)", Tags: []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *flagPath) (*flagOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		flag, err := s.flags.GetFlag(ctx, project.ID, in.FlagKey)
		if err != nil {
			return nil, storeError(err, "flag not found")
		}
		return &flagOutput{Body: flag}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-flag-config", Method: http.MethodGet,
		Path:    base + "/flags/{flagKey}/environments/{envKey}",
		Summary: "Get a flag's configuration in one environment (requires flag.read)",
		Tags:    []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *flagConfigPath) (*flagConfigOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
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
		cfg, err := s.flags.GetFlagConfig(ctx, flag.ID, env.ID)
		if err != nil {
			return nil, storeError(err, "flag config not found")
		}
		return &flagConfigOutput{Body: cfg}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "save-flag", Method: http.MethodPut, Path: base + "/flags/{flagKey}",
		Summary: "Create or update a flag definition (requires flag.write)", Tags: []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *saveFlagInput) (*flagOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		flag, err := s.flags.SaveFlag(ctx, project.ID, in.FlagKey, in.Body.Name, in.Body.Description, in.Body.ClientSideAvailable, in.Body.Variations)
		if err != nil {
			return nil, flagError(err)
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "flag.saved", ResourceType: "flag", ResourceKey: in.FlagKey})
		return &flagOutput{Body: flag}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-flag", Method: http.MethodDelete, Path: base + "/flags/{flagKey}",
		Summary: "Delete a flag (requires flag.delete); cascades its configs", Tags: []string{"Flags"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *flagPath) (*noContent, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagDelete, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		flag, err := s.flags.GetFlag(ctx, project.ID, in.FlagKey)
		if err != nil {
			return nil, storeError(err, "flag not found")
		}
		if err := s.flags.DeleteFlag(ctx, flag.ID); err != nil {
			return nil, flagError(err)
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "flag.deleted", ResourceType: "flag", ResourceKey: in.FlagKey})
		return &noContent{}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "save-flag-config", Method: http.MethodPut,
		Path:    base + "/flags/{flagKey}/environments/{envKey}",
		Summary: "Set a flag's targeting config in an environment (requires flag.write)", Tags: []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *saveFlagConfigInput) (*flagConfigOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
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
		saved, err := s.flags.SaveFlagConfig(ctx, flag.ID, env.ID, models.FlagConfig{
			On:            in.Body.On,
			OffVariation:  in.Body.OffVariation,
			Prerequisites: in.Body.Prerequisites,
			Targets:       in.Body.Targets,
			Rules:         in.Body.Rules,
			Fallthrough:   in.Body.Fallthrough,
		})
		if err != nil {
			return nil, flagError(err)
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "flag.config.set", ResourceType: "flag", ResourceKey: in.FlagKey,
			Data: jsonData(map[string]any{"environment": in.EnvKey})})
		return &flagConfigOutput{Body: saved}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "patch-flag-config", Method: http.MethodPatch,
		Path:    base + "/flags/{flagKey}/environments/{envKey}",
		Summary: "Apply semantic instructions to a flag's env config (requires flag.write)",
		Description: "Surgical, concurrency-friendly edits (turnFlagOn, addRule, addTargets, …) " +
			"instead of replacing the whole config.",
		Tags: []string{"Flags"}, Security: bearer,
	}, func(ctx context.Context, in *patchFlagConfigInput) (*flagConfigOutput, error) {
		_, project, err := s.resolveScope(ctx, in.TenantSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagWrite, models.Resource{TenantID: project.TenantID, ProjectID: project.ID}); err != nil {
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
		saved, err := s.flags.PatchFlagConfig(ctx, flag.ID, env.ID, in.Body.Instructions)
		if err != nil {
			return nil, flagError(err)
		}
		s.audit(ctx, models.AuditEntry{TenantID: project.TenantID, ProjectID: project.ID,
			Action: "flag.config.patched", ResourceType: "flag", ResourceKey: in.FlagKey,
			Comment: in.Body.Comment,
			Data:    jsonData(map[string]any{"environment": in.EnvKey, "instructions": in.Body.Instructions})})
		return &flagConfigOutput{Body: saved}, nil
	})
}
