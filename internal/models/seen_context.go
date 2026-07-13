package models

import (
	"encoding/json"
	"time"
)

// SeenContext is a context recorded during evaluation, for the Contexts inspector.
type SeenContext struct {
	ID            string          `json:"id"`
	EnvironmentID string          `json:"environment_id"`
	Kind          string          `json:"kind"`
	Key           string          `json:"key"`
	Attributes    json.RawMessage `json:"attributes"`
	FirstSeen     time.Time       `json:"first_seen"`
	LastSeen      time.Time       `json:"last_seen"`
}
