package server

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type listContextsInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	EnvKey           string `path:"envKey"`
	Search           string `query:"search" doc:"filter by context kind or key"`
	Limit            int    `query:"limit" doc:"max contexts (default 100, max 500)"`
}

type listContextsOutput struct {
	Body struct {
		Contexts []models.SeenContext `json:"contexts"`
	}
}

type getContextInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	EnvKey           string `path:"envKey"`
	Kind             string `path:"kind"`
	Key              string `path:"key"`
}

// contextEvaluation is one flag's expected result for a context.
type contextEvaluation struct {
	FlagKey   string `json:"flag_key"`
	Variation int    `json:"variation"`
	Value     any    `json:"value"`
	Reason    string `json:"reason"`
}

type getContextOutput struct {
	Body struct {
		Context     models.SeenContext  `json:"context"`
		Evaluations []contextEvaluation `json:"evaluations"`
	}
}

func (s *Server) registerContexts() {
	base := "/api/v1/organizations/{organizationSlug}/projects/{projectKey}"

	huma.Register(s.api, huma.Operation{
		OperationID: "list-contexts", Method: http.MethodGet,
		Path:    base + "/environments/{envKey}/contexts",
		Summary: "List contexts seen during evaluation in an environment (requires flag.read)",
		Tags:    []string{"Contexts"}, Security: bearer,
	}, func(ctx context.Context, in *listContextsInput) (*listContextsOutput, error) {
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
		list, err := s.contexts.List(ctx, env.ID, in.Search, in.Limit)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listContextsOutput{}
		out.Body.Contexts = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "get-context", Method: http.MethodGet,
		Path:    base + "/environments/{envKey}/contexts/{kind}/{key}",
		Summary: "A seen context's attributes and how every flag evaluates for it (requires flag.read)",
		Tags:    []string{"Contexts"}, Security: bearer,
	}, func(ctx context.Context, in *getContextInput) (*getContextOutput, error) {
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
		seen, err := s.contexts.Get(ctx, env.ID, in.Kind, in.Key)
		if err != nil {
			return nil, storeError(err, "context not found")
		}

		// The flags service reconstructs the context and evaluates every flag —
		// the "expected variations" view.
		results := s.flags.EvaluateContext(env.ID, seen.Kind, seen.Key, seen.Attributes)
		evals := make([]contextEvaluation, 0, len(results))
		for _, ev := range results {
			evals = append(evals, contextEvaluation{
				FlagKey: ev.FlagKey, Variation: ev.Variation, Value: ev.Value, Reason: ev.Reason,
			})
		}

		out := &getContextOutput{}
		out.Body.Context = seen
		out.Body.Evaluations = evals
		return out, nil
	})
}
