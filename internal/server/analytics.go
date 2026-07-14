package server

import (
	"context"
	"net/http"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// --- Event ingest (SDK key auth) ---

type ingestEventsInput struct {
	SDKKey string `header:"X-SDK-Key"`
	Body   struct {
		Flags map[string]struct {
			Counters []struct {
				Variation int   `json:"variation"`
				Count     int64 `json:"count"`
			} `json:"counters"`
		} `json:"flags" doc:"rolled-up evaluation counts per flag/variation"`
	}
}

// --- Flag stats query (JWT + flag.read) ---

type flagStatsInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	FlagKey          string `path:"flagKey"`
	EnvKey           string `path:"envKey"`
	Since            string `query:"since" doc:"lookback window, e.g. 1h, 24h (default 24h)"`
}

type flagStatsOutput struct {
	Body struct {
		FlagKey     string                  `json:"flag_key"`
		Environment string                  `json:"environment"`
		Since       string                  `json:"since"`
		Variations  []models.VariationCount `json:"variations"`
		Total       int64                   `json:"total"`
	}
}

func (s *Server) registerAnalytics() {
	huma.Register(s.api, huma.Operation{
		OperationID: "ingest-events", Method: http.MethodPost, Path: "/api/v1/events",
		Summary: "Ingest rolled-up evaluation summaries from a client (SDK key auth)",
		Description: "For clients that evaluate from a local cache (streaming) and so must " +
			"report their own usage. Server-side eval is counted automatically.",
		Tags: []string{"Analytics"}, Security: sdkKeyAuth, DefaultStatus: http.StatusAccepted,
	}, func(ctx context.Context, in *ingestEventsInput) (*noContent, error) {
		env, _, err := s.sdkEnvironment(ctx, in.SDKKey)
		if err != nil {
			return nil, err
		}
		for flagKey, f := range in.Body.Flags {
			for _, c := range f.Counters {
				s.analytics.RecordN(env, flagKey, c.Variation, c.Count)
			}
		}
		return &noContent{}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "flag-stats", Method: http.MethodGet,
		Path:    "/api/v1/organizations/{organizationSlug}/projects/{projectKey}/flags/{flagKey}/environments/{envKey}/stats",
		Summary: "Evaluation counts per variation for a flag in an environment (requires flag.read)",
		Tags:    []string{"Analytics"}, Security: bearer,
	}, func(ctx context.Context, in *flagStatsInput) (*flagStatsOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermFlagRead, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}

		window := 24 * time.Hour
		if in.Since != "" {
			if d, perr := time.ParseDuration(in.Since); perr == nil && d > 0 {
				window = d
			}
		}
		since := time.Now().Add(-window)

		vcs, err := s.analytics.QueryStats(ctx, env.ID, in.FlagKey, since)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &flagStatsOutput{}
		out.Body.FlagKey = in.FlagKey
		out.Body.Environment = in.EnvKey
		out.Body.Since = window.String()
		out.Body.Variations = vcs
		for _, vc := range vcs {
			out.Body.Total += vc.Count
		}
		return out, nil
	})
}
