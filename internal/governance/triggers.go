package governance

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"

	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// Trigger domain errors mapped to HTTP by the handler.
var (
	// ErrInvalidAction is returned for a trigger action other than on/off.
	ErrInvalidAction = errors.New("governance: trigger action must be 'on' or 'off'")
	// ErrTriggerDisabled is returned when firing a disabled trigger.
	ErrTriggerDisabled = errors.New("governance: trigger is disabled")
)

// TriggerInput is the typed request to create a flag trigger.
type TriggerInput struct {
	ProjectID      string
	EnvironmentID  string
	EnvironmentKey string
	FlagKey        string
	Action         string
	Description    string
	CreatedBy      string
	CreatedByEmail string
}

// instructionsForAction maps a trigger action to the semantic instructions it
// applies when fired.
func instructionsForAction(action string) ([]flags.Instruction, error) {
	switch action {
	case models.TriggerActionOn:
		return []flags.Instruction{{Kind: "turnFlagOn"}}, nil
	case models.TriggerActionOff:
		return []flags.Instruction{{Kind: "turnFlagOff"}}, nil
	default:
		return nil, ErrInvalidAction
	}
}

// newTriggerToken mints an unguessable URL token — the trigger's only credential.
func newTriggerToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "trg_" + hex.EncodeToString(b), nil
}

// CreateTrigger mints a trigger (with a fresh token) for a flag + environment.
func (s *Service) CreateTrigger(ctx context.Context, in TriggerInput) (models.FlagTrigger, error) {
	instructions, err := instructionsForAction(in.Action)
	if err != nil {
		return models.FlagTrigger{}, err
	}
	raw, err := json.Marshal(instructions)
	if err != nil {
		return models.FlagTrigger{}, err
	}
	token, err := newTriggerToken()
	if err != nil {
		return models.FlagTrigger{}, err
	}
	return s.store.CreateFlagTrigger(ctx, models.FlagTrigger{
		ProjectID:      in.ProjectID,
		EnvironmentID:  in.EnvironmentID,
		EnvironmentKey: in.EnvironmentKey,
		FlagKey:        in.FlagKey,
		Action:         in.Action,
		Instructions:   raw,
		Token:          token,
		Description:    in.Description,
		CreatedBy:      in.CreatedBy,
		CreatedByEmail: in.CreatedByEmail,
	})
}

// ListTriggers returns a project's triggers. Empty flagKey/envKey are wildcards.
func (s *Service) ListTriggers(ctx context.Context, projectID, flagKey, envKey string) ([]models.FlagTrigger, error) {
	return s.store.ListFlagTriggersByProject(ctx, projectID, flagKey, envKey)
}

// GetTrigger returns one trigger by id.
func (s *Service) GetTrigger(ctx context.Context, id string) (models.FlagTrigger, error) {
	return s.store.GetFlagTrigger(ctx, id)
}

// SetTriggerEnabled enables or disables a trigger.
func (s *Service) SetTriggerEnabled(ctx context.Context, id string, enabled bool) (models.FlagTrigger, error) {
	return s.store.SetFlagTriggerEnabled(ctx, id, enabled)
}

// ResetTriggerToken issues a new token, invalidating the old URL.
func (s *Service) ResetTriggerToken(ctx context.Context, id string) (models.FlagTrigger, error) {
	token, err := newTriggerToken()
	if err != nil {
		return models.FlagTrigger{}, err
	}
	return s.store.ResetFlagTriggerToken(ctx, id, token)
}

// DeleteTrigger removes a trigger.
func (s *Service) DeleteTrigger(ctx context.Context, id string) error {
	return s.store.DeleteFlagTrigger(ctx, id)
}

// Fire looks a trigger up by its URL token and, if enabled, applies its action
// to the flag and records the execution. Returns the trigger for auditing.
func (s *Service) Fire(ctx context.Context, token string) (models.FlagTrigger, error) {
	t, err := s.store.GetFlagTriggerByToken(ctx, token)
	if err != nil {
		return models.FlagTrigger{}, err
	}
	if !t.Enabled {
		return models.FlagTrigger{}, ErrTriggerDisabled
	}
	if err := s.applyInstructions(ctx, t.ProjectID, t.FlagKey, t.EnvironmentID, t.Instructions); err != nil {
		return models.FlagTrigger{}, err
	}
	if err := s.store.RecordFlagTriggerExecution(ctx, t.ID); err != nil {
		return models.FlagTrigger{}, err
	}
	return t, nil
}
