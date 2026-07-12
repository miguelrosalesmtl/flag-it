// Package flags evaluates feature flags per environment and keeps every
// replica's in-memory cache consistent via the pub/sub bus.
package flags

import (
	"encoding/json"
	"errors"
)

// ErrNotFound is returned when a flag key is not configured in an environment.
var ErrNotFound = errors.New("flag not found")

// ValidationError indicates caller-supplied flag data failed validation (400).
type ValidationError struct{ Msg string }

func (e *ValidationError) Error() string { return e.Msg }

func invalid(msg string) error { return &ValidationError{Msg: msg} }

// Evaluation is the result of evaluating a flag for a context.
type Evaluation struct {
	FlagKey   string `json:"flag_key"`
	Value     any    `json:"value"`
	Variation int    `json:"variation"`
	Reason    string `json:"reason"`
}

// rawValue returns the variation value as a decoded any, or nil if out of range.
func rawValue(variations []json.RawMessage, idx int) any {
	if idx < 0 || idx >= len(variations) {
		return nil
	}
	var v any
	if err := json.Unmarshal(variations[idx], &v); err != nil {
		return nil
	}
	return v
}
