// Package governance implements approval workflows: a proposed flag change is
// held as a change request and applied only when a reviewer approves it.
package governance

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/miguelrosalesmtl/flag-it/internal/flags"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
	"github.com/miguelrosalesmtl/flag-it/internal/store"
)

// ErrNotPending is returned when reviewing/cancelling something not pending.
var ErrNotPending = errors.New("governance: not pending")

// Service creates and reviews change requests and applies scheduled changes.
// Applying reuses the flag service's semantic-instruction path.
type Service struct {
	store *store.Store
	flags *flags.Service
	log   *slog.Logger
}

// New returns a governance Service.
func New(st *store.Store, flagSvc *flags.Service, log *slog.Logger) *Service {
	return &Service{store: st, flags: flagSvc, log: log}
}

// Create records a new pending change request.
func (s *Service) Create(ctx context.Context, cr models.ChangeRequest) (models.ChangeRequest, error) {
	return s.store.CreateChangeRequest(ctx, cr)
}

// List returns a project's change requests (status "" = all).
func (s *Service) List(ctx context.Context, projectID, status string) ([]models.ChangeRequest, error) {
	return s.store.ListChangeRequestsByProject(ctx, projectID, status)
}

// Get returns one change request by id.
func (s *Service) Get(ctx context.Context, id string) (models.ChangeRequest, error) {
	return s.store.GetChangeRequest(ctx, id)
}

// Approve applies a pending request's instructions to the flag config, then
// marks it approved.
func (s *Service) Approve(ctx context.Context, id, reviewerID, reviewerEmail, comment string) (models.ChangeRequest, error) {
	cr, err := s.store.GetChangeRequest(ctx, id)
	if err != nil {
		return models.ChangeRequest{}, err
	}
	if cr.Status != models.ChangeStatusPending {
		return models.ChangeRequest{}, ErrNotPending
	}

	if err := s.applyInstructions(ctx, cr.ProjectID, cr.FlagKey, cr.EnvironmentID, cr.Instructions); err != nil {
		return models.ChangeRequest{}, err
	}
	return s.store.ReviewChangeRequest(ctx, id, models.ChangeStatusApproved, reviewerID, reviewerEmail, comment)
}

// applyInstructions resolves the flag and applies a JSON instruction set to its
// config in one environment. Shared by change-request approval and the
// scheduled-change executor.
func (s *Service) applyInstructions(ctx context.Context, projectID, flagKey, environmentID string, raw json.RawMessage) error {
	flag, err := s.flags.GetFlag(ctx, projectID, flagKey)
	if err != nil {
		return err
	}
	var instructions []flags.Instruction
	if err := json.Unmarshal(raw, &instructions); err != nil {
		return err
	}
	_, err = s.flags.PatchFlagConfig(ctx, flag.ID, environmentID, instructions)
	return err
}

// Reject marks a pending request rejected without applying it.
func (s *Service) Reject(ctx context.Context, id, reviewerID, reviewerEmail, comment string) (models.ChangeRequest, error) {
	cr, err := s.store.GetChangeRequest(ctx, id)
	if err != nil {
		return models.ChangeRequest{}, err
	}
	if cr.Status != models.ChangeStatusPending {
		return models.ChangeRequest{}, ErrNotPending
	}
	return s.store.ReviewChangeRequest(ctx, id, models.ChangeStatusRejected, reviewerID, reviewerEmail, comment)
}
