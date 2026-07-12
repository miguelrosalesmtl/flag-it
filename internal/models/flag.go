package models

import (
	"encoding/json"
	"time"
)

// Flag is a flag definition, scoped to a project and shared across all of the
// project's environments.
type Flag struct {
	ID          string `json:"id"`
	ProjectID   string `json:"project_id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	// Salt is a stable per-flag value that salts rollout bucketing so a context
	// isn't stuck in the same percentage slice across different flags.
	Salt string `json:"-"`
	// ClientSideAvailable gates whether client-kind SDK keys (public, e.g.
	// browser) may see/evaluate this flag. Default false = server-side only.
	ClientSideAvailable bool              `json:"client_side_available"`
	Variations          []json.RawMessage `json:"variations"`
	CreatedAt           time.Time         `json:"created_at"`
	UpdatedAt           time.Time         `json:"updated_at"`
}

// Prerequisite gates a flag on another flag: it passes only if the prerequisite
// flag is on and evaluates to Variation.
type Prerequisite struct {
	Key       string `json:"key"`
	Variation int    `json:"variation"`
}

// FlagConfig is a flag's per-environment targeting configuration.
type FlagConfig struct {
	ID            string `json:"id"`
	FlagID        string `json:"flag_id"`
	EnvironmentID string `json:"environment_id"`

	On            bool               `json:"on"`
	OffVariation  int                `json:"off_variation"`
	Prerequisites []Prerequisite     `json:"prerequisites"`
	Targets       []Target           `json:"targets"`
	Rules         []Rule             `json:"rules"`
	Fallthrough   VariationOrRollout `json:"fallthrough"`

	Version   int       `json:"version"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EvalFlag is a flag definition joined with one environment's config: the
// self-contained unit the evaluator consumes, cached per environment.
type EvalFlag struct {
	EnvironmentID       string
	Key                 string
	Salt                string
	ClientSideAvailable bool
	Variations          []json.RawMessage
	On                  bool
	OffVariation        int
	Prerequisites       []Prerequisite
	Targets             []Target
	Rules               []Rule
	Fallthrough         VariationOrRollout
	Version             int
}
