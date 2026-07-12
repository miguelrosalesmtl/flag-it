package models

import "time"

// Segment is a reusable, named collection of contexts, referenced by
// segmentMatch clauses. Membership is: excluded (wins) → included → rules (first
// matching rule includes; a rule with a weight includes only that percentage).
type Segment struct {
	ID          string `json:"id"`
	ProjectID   string `json:"project_id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	// Salt salts the weighted-membership bucketing (stable per segment).
	Salt string `json:"-"`

	Included         []string        `json:"included"`          // user keys always in
	Excluded         []string        `json:"excluded"`          // user keys never in
	IncludedContexts []SegmentTarget `json:"included_contexts"` // non-user kinds
	ExcludedContexts []SegmentTarget `json:"excluded_contexts"`
	Rules            []SegmentRule   `json:"rules"`

	Version   int       `json:"version"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SegmentTarget lists keys of a context kind for include/exclude.
type SegmentTarget struct {
	ContextKind string   `json:"contextKind"`
	Values      []string `json:"values"`
}

// SegmentRule includes a context when all clauses match. If Weight is set, only
// that fraction (out of 100000) of matching contexts are included, bucketed by
// the segment's key+salt.
type SegmentRule struct {
	ID                 string   `json:"id,omitempty"`
	Clauses            []Clause `json:"clauses"`
	Weight             *int     `json:"weight,omitempty"`
	BucketBy           string   `json:"bucketBy,omitempty"`
	RolloutContextKind string   `json:"rolloutContextKind,omitempty"`
}
