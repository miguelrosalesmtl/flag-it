package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// sdkKeyAuth is the security requirement for evaluation endpoints.
var sdkKeyAuth = []map[string][]string{{"sdkKeyAuth": {}}}

// contextDoc describes the free-form multi-kind context field in the spec.
const contextDoc = `Evaluation context. Single-kind: {"kind":"user","key":"u1","country":"US"}. ` +
	`Multi-kind: {"kind":"multi","user":{"key":"u1"},"org":{"key":"o1"}}. No kind = user.`

type evalSingleInput struct {
	SDKKey string `header:"X-SDK-Key"`
	Body   struct {
		FlagKey string         `json:"flag_key"`
		Context map[string]any `json:"context" doc:"see description"`
	}
}

type evaluationOutput struct {
	Body flags.Evaluation
}

type evalAllInput struct {
	SDKKey string `header:"X-SDK-Key"`
	Body   struct {
		Context map[string]any `json:"context" doc:"see description"`
	}
}

// toContext converts a decoded JSON object into a models.Context (which knows
// the single/multi/legacy forms via its UnmarshalJSON).
func toContext(m map[string]any) (models.Context, error) {
	b, err := json.Marshal(m)
	if err != nil {
		return models.Context{}, err
	}
	var c models.Context
	if err := json.Unmarshal(b, &c); err != nil {
		return models.Context{}, err
	}
	return c, nil
}

type evalAllOutput struct {
	Body struct {
		Flags map[string]flags.Evaluation `json:"flags"`
	}
}

func (s *Server) registerEval() {
	huma.Register(s.api, huma.Operation{
		OperationID: "evaluate", Method: http.MethodPost, Path: "/api/v1/eval",
		Summary: "Evaluate one flag for a context (SDK key auth)", Description: contextDoc,
		Tags: []string{"Evaluation"}, Security: sdkKeyAuth,
	}, func(ctx context.Context, in *evalSingleInput) (*evaluationOutput, error) {
		env, clientOnly, err := s.sdkEnvironment(ctx, in.SDKKey)
		if err != nil {
			return nil, err
		}
		if in.Body.FlagKey == "" {
			return nil, huma.Error400BadRequest("flag_key is required")
		}
		if len(in.Body.Context) == 0 {
			return nil, huma.Error400BadRequest("context is required")
		}
		evalCtx, err := toContext(in.Body.Context)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid context")
		}
		eval, err := s.flags.Evaluate(env, in.Body.FlagKey, evalCtx, clientOnly)
		if errors.Is(err, flags.ErrNotFound) {
			return nil, huma.Error404NotFound("flag not found in environment")
		}
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		s.analytics.Record(env, eval.FlagKey, eval.Variation)
		return &evaluationOutput{Body: eval}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "evaluate-all", Method: http.MethodPost, Path: "/api/v1/eval/all",
		Summary: "Evaluate all flags in the environment for a context (SDK key auth)", Description: contextDoc,
		Tags: []string{"Evaluation"}, Security: sdkKeyAuth,
	}, func(ctx context.Context, in *evalAllInput) (*evalAllOutput, error) {
		env, clientOnly, err := s.sdkEnvironment(ctx, in.SDKKey)
		if err != nil {
			return nil, err
		}
		if len(in.Body.Context) == 0 {
			return nil, huma.Error400BadRequest("context is required")
		}
		evalCtx, err := toContext(in.Body.Context)
		if err != nil {
			return nil, huma.Error400BadRequest("invalid context")
		}
		out := &evalAllOutput{}
		out.Body.Flags = s.flags.EvaluateAll(env, evalCtx, clientOnly)
		for _, ev := range out.Body.Flags {
			s.analytics.Record(env, ev.FlagKey, ev.Variation)
		}
		return out, nil
	})
}

// errMissingSDKKey signals an empty SDK key (distinct from an invalid one).
var errMissingSDKKey = errors.New("missing sdk key")

// resolveSDKKey resolves an SDK key to its record via the in-memory cache,
// falling back to Postgres and caching the result (positive or negative). It
// returns errMissingSDKKey for an empty key and store.ErrNotFound for an
// unknown/revoked key. No huma coupling, so the SSE handler can reuse it.
func (s *Server) resolveSDKKey(ctx context.Context, sdkKey string) (models.SdkKey, error) {
	if sdkKey == "" {
		return models.SdkKey{}, errMissingSDKKey
	}
	if sk, found, hit := s.sdkCache.get(sdkKey); hit {
		if !found {
			return models.SdkKey{}, store.ErrNotFound
		}
		return sk, nil
	}
	sk, err := s.store.GetActiveSdkKey(ctx, sdkKey)
	if errors.Is(err, store.ErrNotFound) {
		s.sdkCache.put(sdkKey, models.SdkKey{}, false) // negative cache
		return models.SdkKey{}, store.ErrNotFound
	}
	if err != nil {
		return models.SdkKey{}, err
	}
	s.sdkCache.put(sdkKey, sk, true)
	return sk, nil
}

// sdkEnvironment resolves an SDK key to its environment id and whether it is a
// client (public) key — for which only client-side-available flags are visible.
// Returns huma 401 on a missing/invalid key.
func (s *Server) sdkEnvironment(ctx context.Context, sdkKey string) (envID string, clientOnly bool, err error) {
	sk, e := s.resolveSDKKey(ctx, sdkKey)
	switch {
	case errors.Is(e, errMissingSDKKey):
		return "", false, huma.Error401Unauthorized("missing X-SDK-Key header")
	case errors.Is(e, store.ErrNotFound):
		return "", false, huma.Error401Unauthorized("invalid SDK key")
	case e != nil:
		return "", false, huma.Error500InternalServerError(e.Error())
	}
	return sk.EnvironmentID, sk.Kind == "client", nil
}
