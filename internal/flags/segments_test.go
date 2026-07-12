package flags

import (
	"testing"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

func inSeg(seg models.Segment, ctx models.Context, all map[string]models.Segment) bool {
	return contextInSegment(seg, ctx, all, map[string]bool{})
}

func TestSegment_IncludedExcluded(t *testing.T) {
	seg := models.Segment{
		Key:      "beta",
		Included: []string{"u1", "u2"},
		Excluded: []string{"u2"}, // exclude wins over include
	}
	all := map[string]models.Segment{"beta": seg}

	if !inSeg(seg, models.NewSingleContext("user", "u1", nil), all) {
		t.Fatal("u1 should be included")
	}
	if inSeg(seg, models.NewSingleContext("user", "u2", nil), all) {
		t.Fatal("u2 is excluded; exclude must win over include")
	}
	if inSeg(seg, models.NewSingleContext("user", "u3", nil), all) {
		t.Fatal("u3 is not a member")
	}
}

func TestSegment_RuleMembership(t *testing.T) {
	seg := models.Segment{
		Key: "us-pros",
		Rules: []models.SegmentRule{{
			Clauses: []models.Clause{
				{Attribute: "country", Op: models.OpIn, Values: []any{"US"}},
				{Attribute: "plan", Op: models.OpIn, Values: []any{"pro"}},
			},
		}},
	}
	all := map[string]models.Segment{"us-pros": seg}

	member := models.NewSingleContext("user", "u1", map[string]any{"country": "US", "plan": "pro"})
	if !inSeg(seg, member, all) {
		t.Fatal("US pro user should match segment rule")
	}
	nonMember := models.NewSingleContext("user", "u2", map[string]any{"country": "US", "plan": "free"})
	if inSeg(seg, nonMember, all) {
		t.Fatal("US free user should not match")
	}
}

func TestSegment_WeightedRule(t *testing.T) {
	half := 50000
	seg := models.Segment{
		Key:  "half",
		Salt: "salt",
		Rules: []models.SegmentRule{{
			Clauses: []models.Clause{{Attribute: "country", Op: models.OpIn, Values: []any{"US"}}},
			Weight:  &half, // only 50% of matching contexts are members
		}},
	}
	all := map[string]models.Segment{"half": seg}

	// Deterministic per key, and roughly half of US users are members.
	members := 0
	const n = 4000
	for i := 0; i < n; i++ {
		key := "u-" + string(rune(i%128)) + "-" + string(rune(i/128))
		ctx := models.NewSingleContext("user", key, map[string]any{"country": "US"})
		if inSeg(seg, ctx, all) {
			members++
		}
	}
	if members < n/4 || members > 3*n/4 {
		t.Fatalf("weighted membership out of expected band: %d/%d", members, n)
	}
}

func TestSegmentMatch_ClauseInFlag(t *testing.T) {
	seg := models.Segment{Key: "vips", Included: []string{"vip-1"}}
	segments := map[string]models.Segment{"vips": seg}

	f := threeWayFlag()
	f.Rules = []models.Rule{{
		Clauses:            []models.Clause{{Op: models.OpSegmentMatch, Values: []any{"vips"}}},
		VariationOrRollout: models.VariationOrRollout{Variation: ptr(1)},
	}}

	// Member of the segment -> rule matches.
	if got := EvaluateFlag(f, models.NewSingleContext("user", "vip-1", nil), EvalEnv{Segments: segments}); got.Reason != "RULE_MATCH" || got.Value != "b" {
		t.Fatalf("segment member: got %+v, want RULE_MATCH/b", got)
	}
	// Non-member -> falls through.
	if got := EvaluateFlag(f, models.NewSingleContext("user", "other", nil), EvalEnv{Segments: segments}); got.Reason != "FALLTHROUGH" {
		t.Fatalf("non-member: got %+v, want FALLTHROUGH", got)
	}
	// Unknown segment (empty env) -> non-match -> falls through.
	if got := EvaluateFlag(f, models.NewSingleContext("user", "vip-1", nil), EvalEnv{}); got.Reason != "FALLTHROUGH" {
		t.Fatalf("empty env: got %+v, want FALLTHROUGH", got)
	}
}

func TestSegment_CycleGuard(t *testing.T) {
	// a references b, b references a — must terminate and not match.
	a := models.Segment{Key: "a", Rules: []models.SegmentRule{{Clauses: []models.Clause{{Op: models.OpSegmentMatch, Values: []any{"b"}}}}}}
	b := models.Segment{Key: "b", Rules: []models.SegmentRule{{Clauses: []models.Clause{{Op: models.OpSegmentMatch, Values: []any{"a"}}}}}}
	all := map[string]models.Segment{"a": a, "b": b}
	if inSeg(a, models.NewSingleContext("user", "u1", nil), all) {
		t.Fatal("cyclic segments should not match (and must not loop forever)")
	}
}
