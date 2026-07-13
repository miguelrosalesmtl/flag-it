package governance

import (
	"context"
	"log/slog"
	"time"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// dueBatchSize bounds how many scheduled changes one tick applies, so a large
// backlog is drained over several ticks rather than in one long transaction.
const dueBatchSize = 100

// Schedule records a pending scheduled change.
func (s *Service) Schedule(ctx context.Context, sc models.ScheduledChange) (models.ScheduledChange, error) {
	return s.store.CreateScheduledChange(ctx, sc)
}

// ListScheduled returns a project's scheduled changes. Empty filters are wildcards.
func (s *Service) ListScheduled(ctx context.Context, projectID, status, flagKey, envKey string) ([]models.ScheduledChange, error) {
	return s.store.ListScheduledChangesByProject(ctx, projectID, status, flagKey, envKey)
}

// GetScheduled returns one scheduled change by id.
func (s *Service) GetScheduled(ctx context.Context, id string) (models.ScheduledChange, error) {
	return s.store.GetScheduledChange(ctx, id)
}

// CancelScheduled cancels a pending scheduled change.
func (s *Service) CancelScheduled(ctx context.Context, id string) (models.ScheduledChange, error) {
	sc, err := s.store.CancelScheduledChange(ctx, id)
	if err != nil {
		return models.ScheduledChange{}, err
	}
	return sc, nil
}

// StartScheduler applies due scheduled changes on an interval until the context
// is cancelled. Run it in a goroutine, like the analytics/contexts recorders.
// A single scheduler instance is assumed (one process today).
func (s *Service) StartScheduler(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 15 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.applyDue(ctx)
		}
	}
}

// applyDue applies every scheduled change whose time has come.
func (s *Service) applyDue(ctx context.Context) {
	due, err := s.store.ListDueScheduledChanges(ctx, time.Now(), dueBatchSize)
	if err != nil {
		s.log.Error("scheduler: list due scheduled changes", slog.Any("error", err))
		return
	}
	for _, sc := range due {
		if err := s.applyInstructions(ctx, sc.ProjectID, sc.FlagKey, sc.EnvironmentID, sc.Instructions); err != nil {
			s.log.Error("scheduler: apply scheduled change",
				slog.String("id", sc.ID), slog.String("flag", sc.FlagKey), slog.Any("error", err))
			if markErr := s.store.MarkScheduledChangeFailed(ctx, sc.ID, err.Error()); markErr != nil {
				s.log.Error("scheduler: mark failed", slog.String("id", sc.ID), slog.Any("error", markErr))
			}
			continue
		}
		if err := s.store.MarkScheduledChangeApplied(ctx, sc.ID); err != nil {
			s.log.Error("scheduler: mark applied", slog.String("id", sc.ID), slog.Any("error", err))
			continue
		}
		s.log.Info("scheduler: applied scheduled change",
			slog.String("id", sc.ID), slog.String("flag", sc.FlagKey), slog.String("env", sc.EnvironmentKey))
	}
}
