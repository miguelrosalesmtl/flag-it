package models

import "time"

// EvalStat is a rolled-up count of evaluations for a (flag, variation) in one
// environment during a time window. Written by the periodic flush, not per eval.
type EvalStat struct {
	EnvironmentID string
	FlagKey       string
	Variation     int
	WindowStart   time.Time
	Count         int64
}

// VariationCount is a per-variation total for an analytics query.
type VariationCount struct {
	Variation int   `json:"variation"`
	Count     int64 `json:"count"`
}

// FlagCount is a flag's total evaluations for an environment-level analytics
// query (all variations summed), for ranking flags by activity.
type FlagCount struct {
	FlagKey string `json:"flag_key"`
	Count   int64  `json:"count"`
}
