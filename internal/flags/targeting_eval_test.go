package flags

import (
	"encoding/json"
	"testing"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

func ptr(i int) *int { return &i }

// threeWayFlag: variations [0]="a" [1]="b" [2]="c", off=2, fallthrough=0.
func threeWayFlag() models.EvalFlag {
	return models.EvalFlag{
		Key:          "flag",
		Salt:         "salt",
		Variations:   []json.RawMessage{json.RawMessage(`"a"`), json.RawMessage(`"b"`), json.RawMessage(`"c"`)},
		On:           true,
		OffVariation: 2,
		Fallthrough:  models.VariationOrRollout{Variation: ptr(0)},
	}
}

func TestEval_Off(t *testing.T) {
	f := threeWayFlag()
	f.On = false
	got := EvaluateFlag(f, models.NewSingleContext("user", "u1", nil), EvalEnv{})
	if got.Reason != "OFF" || got.Value != "c" {
		t.Fatalf("got %+v, want OFF/c", got)
	}
}

func TestEval_Fallthrough(t *testing.T) {
	got := EvaluateFlag(threeWayFlag(), models.NewSingleContext("user", "u1", nil), EvalEnv{})
	if got.Reason != "FALLTHROUGH" || got.Value != "a" {
		t.Fatalf("got %+v, want FALLTHROUGH/a", got)
	}
}

func TestEval_IndividualTarget(t *testing.T) {
	f := threeWayFlag()
	f.Targets = []models.Target{{ContextKind: "user", Values: []string{"vip"}, Variation: 1}}
	got := EvaluateFlag(f, models.NewSingleContext("user", "vip", nil), EvalEnv{})
	if got.Reason != "TARGET_MATCH" || got.Value != "b" {
		t.Fatalf("got %+v, want TARGET_MATCH/b", got)
	}
}

func TestEval_RuleMatch(t *testing.T) {
	f := threeWayFlag()
	f.Rules = []models.Rule{{
		Clauses: []models.Clause{
			{Attribute: "country", Op: models.OpIn, Values: []any{"US", "CA"}},
			{Attribute: "plan", Op: models.OpIn, Values: []any{"pro"}},
		},
		VariationOrRollout: models.VariationOrRollout{Variation: ptr(1)},
	}}
	ctx := models.NewSingleContext("user", "u1", map[string]any{"country": "US", "plan": "pro"})
	if got := EvaluateFlag(f, ctx, EvalEnv{}); got.Reason != "RULE_MATCH" || got.Value != "b" {
		t.Fatalf("got %+v, want RULE_MATCH/b", got)
	}
	ctx2 := models.NewSingleContext("user", "u1", map[string]any{"country": "US", "plan": "free"})
	if got := EvaluateFlag(f, ctx2, EvalEnv{}); got.Reason != "FALLTHROUGH" {
		t.Fatalf("got %+v, want FALLTHROUGH", got)
	}
}

func TestEval_ClauseNegateAndMissing(t *testing.T) {
	f := threeWayFlag()
	f.Rules = []models.Rule{{
		Clauses:            []models.Clause{{Attribute: "country", Op: models.OpIn, Values: []any{"US"}, Negate: true}},
		VariationOrRollout: models.VariationOrRollout{Variation: ptr(1)},
	}}
	ctx := models.NewSingleContext("user", "u1", map[string]any{"country": "CA"})
	if got := EvaluateFlag(f, ctx, EvalEnv{}); got.Reason != "RULE_MATCH" {
		t.Fatalf("negate: got %+v, want RULE_MATCH", got)
	}
	ctx2 := models.NewSingleContext("user", "u1", nil)
	if got := EvaluateFlag(f, ctx2, EvalEnv{}); got.Reason != "FALLTHROUGH" {
		t.Fatalf("missing+negate: got %+v, want FALLTHROUGH", got)
	}
}

func TestEval_ArrayAttribute(t *testing.T) {
	f := threeWayFlag()
	f.Rules = []models.Rule{{
		Clauses:            []models.Clause{{Attribute: "groups", Op: models.OpIn, Values: []any{"admins"}}},
		VariationOrRollout: models.VariationOrRollout{Variation: ptr(1)},
	}}
	ctx := models.NewSingleContext("user", "u1", map[string]any{"groups": []any{"users", "admins"}})
	if got := EvaluateFlag(f, ctx, EvalEnv{}); got.Reason != "RULE_MATCH" {
		t.Fatalf("array attr: got %+v, want RULE_MATCH", got)
	}
}

func TestEval_MultiKindContext(t *testing.T) {
	f := threeWayFlag()
	f.Rules = []models.Rule{{
		Clauses:            []models.Clause{{ContextKind: "org", Attribute: "tier", Op: models.OpIn, Values: []any{"enterprise"}}},
		VariationOrRollout: models.VariationOrRollout{Variation: ptr(1)},
	}}
	ctx := models.NewMultiContext(
		models.NewSingleContext("user", "u1", nil),
		models.NewSingleContext("org", "o1", map[string]any{"tier": "enterprise"}),
	)
	if got := EvaluateFlag(f, ctx, EvalEnv{}); got.Reason != "RULE_MATCH" || got.Value != "b" {
		t.Fatalf("multi-kind: got %+v, want RULE_MATCH/b", got)
	}
}

func TestEval_RolloutStableAndWeighted(t *testing.T) {
	f := threeWayFlag()
	f.Fallthrough = models.VariationOrRollout{Rollout: &models.Rollout{
		Variations: []models.WeightedVariation{
			{Variation: 0, Weight: 80000},
			{Variation: 1, Weight: 20000},
		},
	}}

	ctx := models.NewSingleContext("user", "u-42", nil)
	first := EvaluateFlag(f, ctx, EvalEnv{}).Variation
	for i := 0; i < 50; i++ {
		if EvaluateFlag(f, ctx, EvalEnv{}).Variation != first {
			t.Fatal("rollout not stable for same key")
		}
	}

	counts := map[int]int{}
	for i := 0; i < 5000; i++ {
		key := "user-" + string(rune(i%128)) + "-" + string(rune(i/128))
		counts[EvaluateFlag(f, models.NewSingleContext("user", key, nil), EvalEnv{}).Variation]++
	}
	if counts[0] <= counts[1] {
		t.Fatalf("expected variation 0 to dominate 80/20, got %v", counts)
	}
}

func TestEval_Prerequisites(t *testing.T) {
	parent := threeWayFlag()
	parent.Key = "parent"
	parent.Prerequisites = []models.Prerequisite{{Key: "gate", Variation: 0}}
	parent.Fallthrough = models.VariationOrRollout{Variation: ptr(1)} // "b" when prereq passes

	gateOn := models.EvalFlag{Key: "gate", On: true, Variations: []json.RawMessage{json.RawMessage(`true`)}, Fallthrough: models.VariationOrRollout{Variation: ptr(0)}}
	gateOff := models.EvalFlag{Key: "gate", On: false, OffVariation: 0, Variations: []json.RawMessage{json.RawMessage(`true`)}}

	ctx := models.NewSingleContext("user", "u1", nil)

	env := EvalEnv{Flags: map[string]models.EvalFlag{"parent": parent, "gate": gateOn}}
	if got := EvaluateFlag(parent, ctx, env); got.Reason != "FALLTHROUGH" || got.Value != "b" {
		t.Fatalf("prereq pass: got %+v, want FALLTHROUGH/b", got)
	}

	envOff := EvalEnv{Flags: map[string]models.EvalFlag{"parent": parent, "gate": gateOff}}
	if got := EvaluateFlag(parent, ctx, envOff); got.Reason != "PREREQUISITE_FAILED" || got.Value != "c" {
		t.Fatalf("prereq off: got %+v, want PREREQUISITE_FAILED/c", got)
	}

	if got := EvaluateFlag(parent, ctx, EvalEnv{}); got.Reason != "PREREQUISITE_FAILED" {
		t.Fatalf("prereq missing: got %+v, want PREREQUISITE_FAILED", got)
	}

	parent2 := parent
	parent2.Prerequisites = []models.Prerequisite{{Key: "gate", Variation: 1}} // gate serves 0, not 1
	env2 := EvalEnv{Flags: map[string]models.EvalFlag{"parent": parent2, "gate": gateOn}}
	if got := EvaluateFlag(parent2, ctx, env2); got.Reason != "PREREQUISITE_FAILED" {
		t.Fatalf("prereq wrong variation: got %+v, want PREREQUISITE_FAILED", got)
	}
}

func TestEval_PrerequisiteCycle(t *testing.T) {
	a := models.EvalFlag{Key: "a", On: true, OffVariation: 0, Prerequisites: []models.Prerequisite{{Key: "b", Variation: 0}},
		Variations: []json.RawMessage{json.RawMessage(`"x"`)}, Fallthrough: models.VariationOrRollout{Variation: ptr(0)}}
	b := models.EvalFlag{Key: "b", On: true, OffVariation: 0, Prerequisites: []models.Prerequisite{{Key: "a", Variation: 0}},
		Variations: []json.RawMessage{json.RawMessage(`"x"`)}, Fallthrough: models.VariationOrRollout{Variation: ptr(0)}}
	env := EvalEnv{Flags: map[string]models.EvalFlag{"a": a, "b": b}}
	if got := EvaluateFlag(a, models.NewSingleContext("user", "u1", nil), env); got.Reason != "PREREQUISITE_FAILED" {
		t.Fatalf("cycle: got %+v, want PREREQUISITE_FAILED (and no infinite loop)", got)
	}
}

func TestOperators(t *testing.T) {
	cases := []struct {
		op   models.Operator
		ctx  any
		vals []any
		want bool
	}{
		{models.OpIn, "US", []any{"CA", "US"}, true},
		{models.OpIn, float64(3), []any{float64(1), float64(3)}, true},
		{models.OpStartsWith, "hello world", []any{"hello"}, true},
		{models.OpEndsWith, "hello world", []any{"world"}, true},
		{models.OpContains, "hello world", []any{"lo wo"}, true},
		{models.OpContains, "hello", []any{"xyz"}, false},
		{models.OpMatches, "abc123", []any{`^[a-z]+\d+$`}, true},
		{models.OpLessThan, float64(5), []any{float64(10)}, true},
		{models.OpLessThanOrEqual, float64(10), []any{float64(10)}, true},
		{models.OpGreaterThan, float64(20), []any{float64(10)}, true},
		{models.OpGreaterThanOrEqual, float64(10), []any{float64(10)}, true},
		{models.OpBefore, "2020-01-01T00:00:00Z", []any{"2021-01-01T00:00:00Z"}, true},
		{models.OpAfter, "2022-01-01T00:00:00Z", []any{"2021-01-01T00:00:00Z"}, true},
		{models.OpSemVerEqual, "1.2.3", []any{"1.2.3"}, true},
		{models.OpSemVerLessThan, "1.2.3", []any{"1.3.0"}, true},
		{models.OpSemVerGreaterThan, "2.0.0", []any{"1.9.9"}, true},
		{models.OpSegmentMatch, "x", []any{"seg"}, false},
		{models.OpLessThan, "notnum", []any{float64(10)}, false},
	}
	for _, tc := range cases {
		if got := matchOperator(tc.op, tc.ctx, tc.vals); got != tc.want {
			t.Errorf("%s(%v, %v) = %v, want %v", tc.op, tc.ctx, tc.vals, got, tc.want)
		}
	}
}
