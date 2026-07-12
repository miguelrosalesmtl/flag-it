package models

// Operator is a clause test. Values below are the wire strings (LaunchDarkly
// compatible names, chosen deliberately for familiarity).
type Operator string

const (
	OpIn                 Operator = "in"
	OpStartsWith         Operator = "startsWith"
	OpEndsWith           Operator = "endsWith"
	OpContains           Operator = "contains"
	OpMatches            Operator = "matches" // regex
	OpLessThan           Operator = "lessThan"
	OpLessThanOrEqual    Operator = "lessThanOrEqual"
	OpGreaterThan        Operator = "greaterThan"
	OpGreaterThanOrEqual Operator = "greaterThanOrEqual"
	OpBefore             Operator = "before" // timestamp
	OpAfter              Operator = "after"
	OpSemVerEqual        Operator = "semVerEqual"
	OpSemVerLessThan     Operator = "semVerLessThan"
	OpSemVerGreaterThan  Operator = "semVerGreaterThan"
	OpSegmentMatch       Operator = "segmentMatch" // wired in Phase 2
)

// Clause is a single condition: it matches when the resolved attribute matches
// any of Values under Op. A missing attribute is always a non-match (Negate does
// not flip that). When the attribute value is an array, the test is applied per
// element (match if any element matches).
type Clause struct {
	ContextKind string `json:"contextKind,omitempty"`
	// Attribute is optional: segmentMatch clauses omit it (they test segment
	// membership, not an attribute).
	Attribute string   `json:"attribute,omitempty"`
	Op        Operator `json:"op"`
	Values    []any    `json:"values"`
	Negate    bool     `json:"negate,omitempty"`
}

// WeightedVariation is one bucket of a percentage rollout. Weight is out of
// 100000 (100000 = 100%).
type WeightedVariation struct {
	Variation int `json:"variation"`
	Weight    int `json:"weight"`
}

// Rollout distributes contexts across variations by a stable hash bucket.
type Rollout struct {
	Variations  []WeightedVariation `json:"variations"`
	BucketBy    string              `json:"bucketBy,omitempty"`    // attribute ref; default "key"
	ContextKind string              `json:"contextKind,omitempty"` // default "user"
	Seed        *int                `json:"seed,omitempty"`        // stable hash seed
}

// VariationOrRollout is the result of a rule or fallthrough: exactly one of
// Variation (fixed index) or Rollout is set.
type VariationOrRollout struct {
	Variation *int     `json:"variation,omitempty"`
	Rollout   *Rollout `json:"rollout,omitempty"`
}

// Rule is an ordered targeting rule: it matches when every clause matches (AND),
// then serves its VariationOrRollout.
type Rule struct {
	ID                 string   `json:"id,omitempty"`
	Clauses            []Clause `json:"clauses"`
	VariationOrRollout          // promoted: "variation" | "rollout"
}

// Target is individual targeting: the listed keys of a context kind are served a
// fixed variation, ahead of any rules.
type Target struct {
	ContextKind string   `json:"contextKind,omitempty"`
	Values      []string `json:"values"`
	Variation   int      `json:"variation"`
}
