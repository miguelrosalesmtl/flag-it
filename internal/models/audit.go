package models

import (
	"encoding/json"
	"time"
)

// AuditEntry is one immutable record of a change. TenantID is empty for
// platform-level actions (e.g. creating a user); ProjectID is set for
// project-scoped actions. ActorID/ActorEmail identify who did it (email is
// denormalized so the record survives user deletion).
type AuditEntry struct {
	ID           string          `json:"id"`
	TenantID     string          `json:"tenant_id,omitempty"`
	ProjectID    string          `json:"project_id,omitempty"`
	ActorID      string          `json:"actor_id,omitempty"`
	ActorEmail   string          `json:"actor_email"`
	Action       string          `json:"action"`        // e.g. flag.config.patched
	ResourceType string          `json:"resource_type"` // e.g. flag, segment, sdk_key, role
	ResourceKey  string          `json:"resource_key"`
	Comment      string          `json:"comment,omitempty"`
	Data         json.RawMessage `json:"data,omitempty"` // instruction/before-after detail
	CreatedAt    time.Time       `json:"created_at"`
}
