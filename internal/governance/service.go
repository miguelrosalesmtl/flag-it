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

// Domain errors returned by the service and mapped to HTTP by the handler.
var (
	// ErrNotPending is returned when reviewing/cancelling something not pending.
	ErrNotPending = errors.New("governance: not pending")
	// ErrNoInstructions is returned when a change carries no instructions.
	ErrNoInstructions = errors.New("governance: at least one instruction is required")
	// ErrScheduledInPast is returned when a change is scheduled for the past.
	ErrScheduledInPast = errors.New("governance: scheduled_for must be in the future")
)

// ChangeRequestInput is the typed request to propose a change. The service owns
// serialising the instructions and building the domain record.
type ChangeRequestInput struct {
	ProjectID        string
	EnvironmentID    string
	EnvironmentKey   string
	FlagKey          string
	Instructions     []flags.Instruction
	Comment          string
	RequestedBy      string
	RequestedByEmail string
}

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

// Create records a new pending change request. It validates and serialises the
// instructions itself so the handler stays free of domain logic.
func (s *Service) Create(ctx context.Context, in ChangeRequestInput) (models.ChangeRequest, error) {
	if len(in.Instructions) == 0 {
		return models.ChangeRequest{}, ErrNoInstructions
	}
	raw, err := json.Marshal(in.Instructions)
	if err != nil {
		return models.ChangeRequest{}, err
	}
	return s.store.CreateChangeRequest(ctx, models.ChangeRequest{
		ProjectID:        in.ProjectID,
		EnvironmentID:    in.EnvironmentID,
		EnvironmentKey:   in.EnvironmentKey,
		FlagKey:          in.FlagKey,
		Instructions:     raw,
		Comment:          in.Comment,
		RequestedBy:      in.RequestedBy,
		RequestedByEmail: in.RequestedByEmail,
	})
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
