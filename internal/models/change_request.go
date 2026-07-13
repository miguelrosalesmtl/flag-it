package models

import (
	"encoding/json"
	"time"
)

// ChangeRequest statuses.
const (
	ChangeStatusPending  = "pending"
	ChangeStatusApproved = "approved"
	ChangeStatusRejected = "rejected"
)

// ChangeRequest is a proposed change to a flag's environment config (a set of
// semantic instructions) awaiting review. On approval the instructions are
// applied; the request records who proposed and who reviewed it.
type ChangeRequest struct {
	ID               string          `json:"id"`
	ProjectID        string          `json:"project_id"`
	EnvironmentID    string          `json:"environment_id"`
	EnvironmentKey   string          `json:"environment_key"`
	FlagKey          string          `json:"flag_key"`
	Instructions     json.RawMessage `json:"instructions"`
	Comment          string          `json:"comment"`
	Status           string          `json:"status"`
	RequestedBy      string          `json:"requested_by"`
	RequestedByEmail string          `json:"requested_by_email"`
	ReviewedBy       *string         `json:"reviewed_by,omitempty"`
	ReviewedByEmail  string          `json:"reviewed_by_email,omitempty"`
	ReviewComment    string          `json:"review_comment,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	ReviewedAt       *time.Time      `json:"reviewed_at,omitempty"`
}
