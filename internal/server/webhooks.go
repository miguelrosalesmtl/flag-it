package server

import (
	"context"
	"errors"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/webhooks"
)

type createWebhookInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	Body             struct {
		URL         string   `json:"url" format:"uri" doc:"where to POST events"`
		EventTypes  []string `json:"event_types" doc:"audit actions to subscribe to, or [\"*\"] for all"`
		Description string   `json:"description,omitempty"`
	}
}

type listWebhooksInput struct {
	OrganizationSlug string `path:"organizationSlug"`
}

type webhookIDInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	WebhookID        string `path:"webhookId"`
}

type setWebhookEnabledInput struct {
	OrganizationSlug string `path:"organizationSlug"`
	WebhookID        string `path:"webhookId"`
	Body             struct {
		Enabled bool `json:"enabled"`
	}
}

type webhookOutput struct {
	Body models.Webhook
}

type listWebhooksOutput struct {
	Body struct {
		Webhooks []models.Webhook `json:"webhooks"`
	}
}

type deliveryOutput struct {
	Body models.WebhookDelivery
}

type listDeliveriesOutput struct {
	Body struct {
		Deliveries []models.WebhookDelivery `json:"deliveries"`
	}
}

func (s *Server) registerWebhooks() {
	base := "/api/v1/organizations/{organizationSlug}/webhooks"

	huma.Register(s.api, huma.Operation{
		OperationID: "create-webhook", Method: http.MethodPost, Path: base,
		Summary: "Register an outbound webhook (requires webhook.manage)",
		Description: "Subscribed events (audit actions, or \"*\" for all) are delivered as signed " +
			"POSTs. The signing secret is returned only here and on reset.",
		Tags: []string{"Webhooks"}, Security: bearer,
	}, func(ctx context.Context, in *createWebhookInput) (*webhookOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermWebhookManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		user, err := s.auth.GetUser(ctx, userID(ctx))
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		w, err := s.webhooks.Create(ctx, webhooks.WebhookInput{
			OrganizationID: organization.ID,
			URL:            in.Body.URL,
			EventTypes:     in.Body.EventTypes,
			Description:    in.Body.Description,
			CreatedBy:      user.ID,
			CreatedByEmail: user.Email,
		})
		if err != nil {
			return nil, webhookError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "webhook.created", ResourceType: "webhook", ResourceKey: w.ID,
			Data: jsonData(map[string]any{"url": w.URL, "event_types": w.EventTypes})})
		return &webhookOutput{Body: w}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-webhooks", Method: http.MethodGet, Path: base,
		Summary: "List a organization's webhooks, without their secrets (requires webhook.manage)",
		Tags:    []string{"Webhooks"}, Security: bearer,
	}, func(ctx context.Context, in *listWebhooksInput) (*listWebhooksOutput, error) {
		organization, err := s.resolveOrganization(ctx, in.OrganizationSlug)
		if err != nil {
			return nil, err
		}
		if err := s.authorize(ctx, models.PermWebhookManage, models.Resource{OrganizationID: organization.ID}); err != nil {
			return nil, err
		}
		list, err := s.webhooks.List(ctx, organization.ID)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		for i := range list {
			list[i].Secret = "" // never re-expose the signing secret
		}
		out := &listWebhooksOutput{}
		out.Body.Webhooks = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "set-webhook-enabled", Method: http.MethodPost, Path: base + "/{webhookId}/enabled",
		Summary: "Enable or disable a webhook (requires webhook.manage)",
		Tags:    []string{"Webhooks"}, Security: bearer,
	}, func(ctx context.Context, in *setWebhookEnabledInput) (*webhookOutput, error) {
		organization, w, err := s.resolveWebhook(ctx, in.OrganizationSlug, in.WebhookID)
		if err != nil {
			return nil, err
		}
		updated, err := s.webhooks.SetEnabled(ctx, w.ID, in.Body.Enabled)
		if err != nil {
			return nil, webhookError(err)
		}
		action := "webhook.disabled"
		if in.Body.Enabled {
			action = "webhook.enabled"
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: action, ResourceType: "webhook", ResourceKey: w.ID})
		updated.Secret = ""
		return &webhookOutput{Body: updated}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "reset-webhook-secret", Method: http.MethodPost, Path: base + "/{webhookId}/reset",
		Summary: "Reset a webhook's signing secret (requires webhook.manage)",
		Tags:    []string{"Webhooks"}, Security: bearer,
	}, func(ctx context.Context, in *webhookIDInput) (*webhookOutput, error) {
		organization, w, err := s.resolveWebhook(ctx, in.OrganizationSlug, in.WebhookID)
		if err != nil {
			return nil, err
		}
		updated, err := s.webhooks.ResetSecret(ctx, w.ID)
		if err != nil {
			return nil, webhookError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "webhook.reset", ResourceType: "webhook", ResourceKey: w.ID})
		return &webhookOutput{Body: updated}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "test-webhook", Method: http.MethodPost, Path: base + "/{webhookId}/test",
		Summary: "Send a test event to a webhook (requires webhook.manage)",
		Tags:    []string{"Webhooks"}, Security: bearer,
	}, func(ctx context.Context, in *webhookIDInput) (*deliveryOutput, error) {
		_, w, err := s.resolveWebhook(ctx, in.OrganizationSlug, in.WebhookID)
		if err != nil {
			return nil, err
		}
		d, err := s.webhooks.Test(ctx, w.ID)
		if err != nil {
			return nil, webhookError(err)
		}
		return &deliveryOutput{Body: d}, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "list-webhook-deliveries", Method: http.MethodGet, Path: base + "/{webhookId}/deliveries",
		Summary: "List a webhook's recent delivery attempts (requires webhook.manage)",
		Tags:    []string{"Webhooks"}, Security: bearer,
	}, func(ctx context.Context, in *webhookIDInput) (*listDeliveriesOutput, error) {
		_, w, err := s.resolveWebhook(ctx, in.OrganizationSlug, in.WebhookID)
		if err != nil {
			return nil, err
		}
		list, err := s.webhooks.ListDeliveries(ctx, w.ID, 50)
		if err != nil {
			return nil, huma.Error500InternalServerError(err.Error())
		}
		out := &listDeliveriesOutput{}
		out.Body.Deliveries = list
		return out, nil
	})

	huma.Register(s.api, huma.Operation{
		OperationID: "delete-webhook", Method: http.MethodDelete, Path: base + "/{webhookId}",
		Summary: "Delete a webhook (requires webhook.manage)",
		Tags:    []string{"Webhooks"}, Security: bearer, DefaultStatus: http.StatusNoContent,
	}, func(ctx context.Context, in *webhookIDInput) (*noContent, error) {
		organization, w, err := s.resolveWebhook(ctx, in.OrganizationSlug, in.WebhookID)
		if err != nil {
			return nil, err
		}
		if err := s.webhooks.Delete(ctx, w.ID); err != nil {
			return nil, webhookError(err)
		}
		s.audit(ctx, models.AuditEntry{OrganizationID: organization.ID,
			Action: "webhook.deleted", ResourceType: "webhook", ResourceKey: w.ID})
		return &noContent{}, nil
	})
}

// resolveWebhook resolves the organization + a webhook, enforcing that the webhook
// belongs to that organization. Requires webhook.manage (all webhook ops do).
func (s *Server) resolveWebhook(ctx context.Context, organizationSlug, webhookID string) (models.Organization, models.Webhook, error) {
	organization, err := s.resolveOrganization(ctx, organizationSlug)
	if err != nil {
		return models.Organization{}, models.Webhook{}, err
	}
	if err := s.authorize(ctx, models.PermWebhookManage, models.Resource{OrganizationID: organization.ID}); err != nil {
		return models.Organization{}, models.Webhook{}, err
	}
	w, err := s.webhooks.Get(ctx, webhookID)
	if err != nil {
		return models.Organization{}, models.Webhook{}, storeError(err, "webhook not found")
	}
	if w.OrganizationID != organization.ID {
		return models.Organization{}, models.Webhook{}, huma.Error404NotFound("webhook not found")
	}
	return organization, w, nil
}

// webhookError maps webhooks-service errors to HTTP statuses.
func webhookError(err error) error {
	if errors.Is(err, webhooks.ErrNoEventTypes) {
		return huma.Error400BadRequest(err.Error())
	}
	return flagError(err)
}
