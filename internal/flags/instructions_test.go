package flags

import (
	"testing"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

func baseConfig() models.FlagConfig {
	return models.FlagConfig{
		On:           false,
		OffVariation: 1,
		Fallthrough:  models.VariationOrRollout{Variation: ptr(1)},
	}
}

func TestInstructions_ToggleAndOffVariation(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{
		{Kind: InsTurnFlagOn},
		{Kind: InsUpdateOffVariation, Variation: ptr(0)},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.On || cfg.OffVariation != 0 {
		t.Fatalf("got on=%v off=%d", cfg.On, cfg.OffVariation)
	}
}

func TestInstructions_AddAndRemoveRule(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{
		{Kind: InsAddRule, Clauses: []models.Clause{{Attribute: "country", Op: models.OpIn, Values: []any{"US"}}}, Variation: ptr(0)},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.Rules) != 1 || cfg.Rules[0].ID == "" {
		t.Fatalf("expected 1 rule with an id, got %+v", cfg.Rules)
	}
	id := cfg.Rules[0].ID
	cfg2, err := ApplyInstructions(cfg, []Instruction{{Kind: InsRemoveRule, RuleID: id}})
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg2.Rules) != 0 {
		t.Fatalf("expected rule removed, got %+v", cfg2.Rules)
	}
}

func TestInstructions_AddRuleWithRollout(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{{
		Kind:    InsAddRule,
		Clauses: []models.Clause{{Attribute: "plan", Op: models.OpIn, Values: []any{"pro"}}},
		Rollout: &models.Rollout{Variations: []models.WeightedVariation{
			{Variation: 0, Weight: 60000}, {Variation: 1, Weight: 40000},
		}},
	}})
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.Rules) != 1 || cfg.Rules[0].Rollout == nil || cfg.Rules[0].Variation != nil {
		t.Fatalf("expected 1 rollout rule, got %+v", cfg.Rules)
	}
	if got := cfg.Rules[0].Rollout.Variations; len(got) != 2 || got[0].Weight != 60000 {
		t.Fatalf("unexpected rollout weights: %+v", got)
	}
}

func TestInstructions_UpdateRule(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{
		{Kind: InsAddRule, Clauses: []models.Clause{{Attribute: "a", Op: models.OpIn, Values: []any{"1"}}}, Variation: ptr(0)},
		{Kind: InsAddRule, Clauses: []models.Clause{{Attribute: "b", Op: models.OpIn, Values: []any{"1"}}}, Variation: ptr(0)},
	})
	if err != nil {
		t.Fatal(err)
	}
	targetID := cfg.Rules[0].ID

	// Edit the first rule: new clause + switch to a rollout. Id and position stay.
	updated, err := ApplyInstructions(cfg, []Instruction{{
		Kind:    InsUpdateRule,
		RuleID:  targetID,
		Clauses: []models.Clause{{Attribute: "country", Op: models.OpIn, Values: []any{"US"}}},
		Rollout: &models.Rollout{Variations: []models.WeightedVariation{
			{Variation: 0, Weight: 50000}, {Variation: 1, Weight: 50000},
		}},
	}})
	if err != nil {
		t.Fatal(err)
	}
	r := updated.Rules[0]
	if r.ID != targetID {
		t.Fatalf("id changed: %s -> %s", targetID, r.ID)
	}
	if len(r.Clauses) != 1 || r.Clauses[0].Attribute != "country" {
		t.Fatalf("clauses not updated: %+v", r.Clauses)
	}
	if r.Variation != nil || r.Rollout == nil {
		t.Fatalf("served value not switched to rollout: %+v", r.VariationOrRollout)
	}
	if updated.Rules[1].Clauses[0].Attribute != "b" {
		t.Fatalf("second rule disturbed: %+v", updated.Rules[1])
	}

	// Unknown id is rejected.
	if _, err := ApplyInstructions(cfg, []Instruction{{
		Kind: InsUpdateRule, RuleID: "nope",
		Clauses: []models.Clause{{Attribute: "a", Op: models.OpIn, Values: []any{"1"}}}, Variation: ptr(0),
	}}); err == nil {
		t.Fatal("expected error for unknown rule id")
	}
}

func TestInstructions_ReorderRules(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{
		{Kind: InsAddRule, Clauses: []models.Clause{{Attribute: "a", Op: models.OpIn, Values: []any{"1"}}}, Variation: ptr(0)},
		{Kind: InsAddRule, Clauses: []models.Clause{{Attribute: "b", Op: models.OpIn, Values: []any{"1"}}}, Variation: ptr(0)},
		{Kind: InsAddRule, Clauses: []models.Clause{{Attribute: "c", Op: models.OpIn, Values: []any{"1"}}}, Variation: ptr(0)},
	})
	if err != nil {
		t.Fatal(err)
	}
	ids := []string{cfg.Rules[0].ID, cfg.Rules[1].ID, cfg.Rules[2].ID}

	// Move the last rule to the front.
	reordered, err := ApplyInstructions(cfg, []Instruction{
		{Kind: InsReorderRules, RuleIDs: []string{ids[2], ids[0], ids[1]}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := []string{reordered.Rules[0].ID, reordered.Rules[1].ID, reordered.Rules[2].ID}; got[0] != ids[2] || got[1] != ids[0] || got[2] != ids[1] {
		t.Fatalf("reorder failed: %v", got)
	}

	// A partial / duplicate / unknown id list is rejected.
	for _, bad := range [][]string{
		{ids[0], ids[1]},         // missing one
		{ids[0], ids[0], ids[1]}, // duplicate
		{ids[0], ids[1], "nope"}, // unknown
	} {
		if _, err := ApplyInstructions(cfg, []Instruction{{Kind: InsReorderRules, RuleIDs: bad}}); err == nil {
			t.Fatalf("expected error for reorder ids %v", bad)
		}
	}
}

func TestInstructions_Targets(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{
		{Kind: InsAddTargets, Variation: ptr(0), Values: []string{"a", "b"}},
		{Kind: InsAddTargets, Variation: ptr(0), Values: []string{"b", "c"}}, // merges, dedupes
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.Targets) != 1 || len(cfg.Targets[0].Values) != 3 {
		t.Fatalf("expected merged target of 3, got %+v", cfg.Targets)
	}
	cfg2, err := ApplyInstructions(cfg, []Instruction{{Kind: InsRemoveTargets, Variation: ptr(0), Values: []string{"a", "b", "c"}}})
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg2.Targets) != 0 {
		t.Fatalf("expected empty target dropped, got %+v", cfg2.Targets)
	}
}

func TestInstructions_Prerequisites(t *testing.T) {
	cfg, err := ApplyInstructions(baseConfig(), []Instruction{
		{Kind: InsAddPrerequisite, Key: "gate", Variation: ptr(0)},
	})
	if err != nil || len(cfg.Prerequisites) != 1 {
		t.Fatalf("add prereq: %+v err=%v", cfg.Prerequisites, err)
	}
	cfg2, _ := ApplyInstructions(cfg, []Instruction{{Kind: InsRemovePrerequisite, Key: "gate"}})
	if len(cfg2.Prerequisites) != 0 {
		t.Fatalf("expected prereq removed, got %+v", cfg2.Prerequisites)
	}
}

func TestInstructions_Errors(t *testing.T) {
	if _, err := ApplyInstructions(baseConfig(), nil); err == nil {
		t.Fatal("expected error for no instructions")
	}
	if _, err := ApplyInstructions(baseConfig(), []Instruction{{Kind: "bogus"}}); err == nil {
		t.Fatal("expected error for unknown kind")
	}
	if _, err := ApplyInstructions(baseConfig(), []Instruction{{Kind: InsUpdateOffVariation}}); err == nil {
		t.Fatal("expected error for missing variation")
	}
	var verr *ValidationError
	_, err := ApplyInstructions(baseConfig(), []Instruction{{Kind: "bogus"}})
	if !isValErr(err, &verr) {
		t.Fatalf("expected *ValidationError, got %T", err)
	}
}

func isValErr(err error, target **ValidationError) bool {
	v, ok := err.(*ValidationError)
	if ok {
		*target = v
	}
	return ok
}
