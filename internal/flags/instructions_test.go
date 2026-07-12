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
