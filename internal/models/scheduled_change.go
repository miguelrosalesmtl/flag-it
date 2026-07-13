package models

import (
	"encoding/json"
	"time"
)

// ScheduledChange statuses.
const (
	ScheduledStatusPending   = "pending"
	ScheduledStatusApplied   = "applied"
	ScheduledStatusCancelled = "cancelled"
	ScheduledStatusFailed    = "failed"
)

// ScheduledChange is a set of semantic instructions to apply to a flag's
// environment config at a future time. A background scheduler applies pending
// changes once scheduled_for has passed.
type ScheduledChange struct {
	ID             string          `json:"id"`
	ProjectID      string          `json:"project_id"`
	EnvironmentID  string          `json:"environment_id"`
	EnvironmentKey string          `json:"environment_key"`
	FlagKey        string          `json:"flag_key"`
	Instructions   json.RawMessage `json:"instructions"`
	Comment        string          `json:"comment"`
	ScheduledFor   time.Time       `json:"scheduled_for"`
	Status         string          `json:"status"`
	Error          string          `json:"error,omitempty"`
	CreatedBy      string          `json:"created_by"`
	CreatedByEmail string          `json:"created_by_email"`
	CreatedAt      time.Time       `json:"created_at"`
	AppliedAt      *time.Time      `json:"applied_at,omitempty"`
}
