package server

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/catalog"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

type envKeyPath struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	EnvKey           string `path:"envKey"`
}

type listSdkKeysOutput struct {
	Body struct {
		SdkKeys []models.SdkKey `json:"sdk_keys"`
	}
}

type createSdkKeyInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	EnvKey           string `path:"envKey"`
	Body             struct {
		Kind string `json:"kind" enum:"server,client"`
		Name string `json:"name,omitempty"`
	}
}

type sdkKeyOutput struct {
	Body models.SdkKey
}

type revokeSdkKeyInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	ProjectKey       string `path:"projectKey"`
	EnvKey           string `path:"envKey"`
	KeyID            string `path:"keyID"`
}

func (s *Server) registerSDKKeys() {
	base := "/api/v1/organizations/{organizationSlug}/projects/{projectKey}/environments/{envKey}/sdk-keys"

	huma.Register(s.api, huma.Operation{
		OperationID: "list-sdk-keys", Method: http.MethodGet, Path: base,
		Summary: "List an environment's SDK keys (requires sdk_key.manage)", Tags: []string{"SDK Keys"}, Security: bearer,
	}, func(ctx context.Context, in *envKeyPath) (*listSdkKeysOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermSDKKeyManage, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}
		keys, err := s.catalog.ListSdkKeys(ctx, env.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listSdkKeysOutput{}
		out.Body.SdkKeys = keys
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "create-sdk-key", Method: http.MethodPost, Path: base,
		Summary: "Mint an SDK key (requires sdk_key.manage); response includes the secret", Tags: []string{"SDK Keys"}, Security: bearer,
		DefaultStatus: http.StatusCreated,
	}, func(ctx context.Context, in *createSdkKeyInput) (*sdkKeyOutput, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermSDKKeyManage, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}
		sk, err := s.catalog.CreateSdkKey(ctx, env.ID, in.Body.Kind, in.Body.Name)
		if errors.Is(err, catalog.ErrInvalidSDKKeyKind) {
			return nil, huma.Error400BadRequest("kind must be 'server' or 'client'")
		}
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		// Never log the secret key value — only its metadata.
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "sdk_key.created", ResourceType: "sdk_key", ResourceKey: sk.ID,
			Data: jsonData(map[string]any{"environment": in.EnvKey, "kind": in.Body.Kind, "name": in.Body.Name})})
		return &sdkKeyOutput{Body: sk}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "revoke-sdk-key", Method: http.MethodDelete, Path: base + "/{keyID}",
		Summary: "Revoke an SDK key (requires sdk_key.manage)", Tags: []string{"SDK Keys"}, Security: bearer,
		DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *revokeSdkKeyInput) (*noContent, error) {
		_, project, err := s.resolveScope(ctx, in.OrganizationSlug, in.ProjectKey)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermSDKKeyManage, models.Resource{OrganizationID: project.OrganizationID, ProjectID: project.ID}); err != nil {
			return nil, err
		}
		env, err := s.resolveEnv(ctx, project.ID, in.EnvKey)
		if err != nil {
			return nil, err
		}
		if err := s.catalog.RevokeSdkKey(ctx, in.KeyID, env.ID); err != nil {
			return nil, storeError(err, "sdk key not found or already revoked")
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: project.OrganizationID, ProjectID: project.ID,
			Action: "sdk_key.revoked", ResourceType: "sdk_key", ResourceKey: in.KeyID,
			Data: jsonData(map[string]any{"environment": in.EnvKey})})
		return &noContent{}, nil
	})
}
