package models

import (
	"encoding/json"
	"time"
)

// Flag trigger actions (what firing the webhook does).
const (
	TriggerActionOn  = "on"
	TriggerActionOff = "off"
)

// FlagTrigger is an inbound webhook that applies a fixed action to a flag in one
// environment when its URL is POSTed to. The token embedded in that URL is the
// only credential, so it is returned to managers on create/reset but never
// re-listed.
type FlagTrigger struct {
	ID             string          `json:"id"`
	ProjectID      string          `json:"project_id"`
	EnvironmentID  string          `json:"environment_id"`
	EnvironmentKey string          `json:"environment_key"`
	FlagKey        string          `json:"flag_key"`
	Action         string          `json:"action"`
	Instructions   json.RawMessage `json:"-"`
	// Token is the URL secret. Populated only in create/reset responses; blanked
	// elsewhere so it is shown once.
	Token          string     `json:"token,omitempty"`
	Description    string     `json:"description"`
	Enabled        bool       `json:"enabled"`
	ExecCount      int64      `json:"exec_count"`
	CreatedBy      string     `json:"created_by"`
	CreatedByEmail string     `json:"created_by_email"`
	CreatedAt      time.Time  `json:"created_at"`
	LastExecutedAt *time.Time `json:"last_executed_at,omitempty"`
}
