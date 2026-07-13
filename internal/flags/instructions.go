package flags

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// Instruction is a single intent-ful change to a flag's per-environment config.
// It carries a Kind plus whichever parameter fields that kind uses. Applying a
// list of instructions surgically edits the config (vs replacing the whole
// object), which is concurrency-friendlier and records intent for auditing.
type Instruction struct {
	Kind string `json:"kind" doc:"turnFlagOn | turnFlagOff | updateOffVariation | updateFallthroughVariation | updateFallthroughRollout | addTargets | removeTargets | addRule | removeRule | reorderRules | addPrerequisite | removePrerequisite"`

	Variation   *int            `json:"variation,omitempty"`
	Values      []string        `json:"values,omitempty"`
	ContextKind string          `json:"contextKind,omitempty"`
	Clauses     []models.Clause `json:"clauses,omitempty"`
	Rollout     *models.Rollout `json:"rollout,omitempty"`
	RuleID      string          `json:"ruleId,omitempty"`
	RuleIDs     []string        `json:"ruleIds,omitempty"` // reorderRules: the full rule order
	Key         string          `json:"key,omitempty"`     // prerequisite flag key
}

// Instruction kinds.
const (
	InsTurnFlagOn                 = "turnFlagOn"
	InsTurnFlagOff                = "turnFlagOff"
	InsUpdateOffVariation         = "updateOffVariation"
	InsUpdateFallthroughVariation = "updateFallthroughVariation"
	InsUpdateFallthroughRollout   = "updateFallthroughRollout"
	InsAddTargets                 = "addTargets"
	InsRemoveTargets              = "removeTargets"
	InsAddRule                    = "addRule"
	InsRemoveRule                 = "removeRule"
	InsReorderRules               = "reorderRules"
	InsAddPrerequisite            = "addPrerequisite"
	InsRemovePrerequisite         = "removePrerequisite"
)

// ApplyInstructions applies instructions in order to a copy of cfg, returning
// the new config. Errors are ValidationErrors (400).
func ApplyInstructions(cfg models.FlagConfig, instructions []Instruction) (models.FlagConfig, error) {
	if len(instructions) == 0 {
		return models.FlagConfig{}, invalid("no instructions provided")
	}
	for i, in := range instructions {
		if err := applyInstruction(&cfg, in); err != nil {
			return models.FlagConfig{}, invalid(fmt.Sprintf("instruction %d (%s): %s", i, in.Kind, err.Error()))
		}
	}
	return cfg, nil
}

func applyInstruction(cfg *models.FlagConfig, in Instruction) error {
	switch in.Kind {
	case InsTurnFlagOn:
		cfg.On = true
	case InsTurnFlagOff:
		cfg.On = false
	case InsUpdateOffVariation:
		if in.Variation == nil {
			return fmt.Errorf("variation is required")
		}
		cfg.OffVariation = *in.Variation
	case InsUpdateFallthroughVariation:
		if in.Variation == nil {
			return fmt.Errorf("variation is required")
		}
		cfg.Fallthrough = models.VariationOrRollout{Variation: in.Variation}
	case InsUpdateFallthroughRollout:
		if in.Rollout == nil {
			return fmt.Errorf("rollout is required")
		}
		cfg.Fallthrough = models.VariationOrRollout{Rollout: in.Rollout}
	case InsAddTargets:
		if in.Variation == nil {
			return fmt.Errorf("variation is required")
		}
		addTargets(cfg, in.ContextKind, *in.Variation, in.Values)
	case InsRemoveTargets:
		if in.Variation == nil {
			return fmt.Errorf("variation is required")
		}
		removeTargets(cfg, in.ContextKind, *in.Variation, in.Values)
	case InsAddRule:
		if len(in.Clauses) == 0 {
			return fmt.Errorf("clauses are required")
		}
		if in.Variation == nil && in.Rollout == nil {
			return fmt.Errorf("variation or rollout is required")
		}
		cfg.Rules = append(cfg.Rules, models.Rule{
			ID:                 newRuleID(),
			Clauses:            in.Clauses,
			VariationOrRollout: models.VariationOrRollout{Variation: in.Variation, Rollout: in.Rollout},
		})
	case InsRemoveRule:
		if in.RuleID == "" {
			return fmt.Errorf("ruleId is required")
		}
		cfg.Rules = removeRule(cfg.Rules, in.RuleID)
	case InsReorderRules:
		return reorderRules(cfg, in.RuleIDs)
	case InsAddPrerequisite:
		if in.Key == "" || in.Variation == nil {
			return fmt.Errorf("key and variation are required")
		}
		cfg.Prerequisites = append(cfg.Prerequisites, models.Prerequisite{Key: in.Key, Variation: *in.Variation})
	case InsRemovePrerequisite:
		if in.Key == "" {
			return fmt.Errorf("key is required")
		}
		cfg.Prerequisites = removePrerequisite(cfg.Prerequisites, in.Key)
	default:
		return fmt.Errorf("unknown instruction kind")
	}
	return nil
}

func addTargets(cfg *models.FlagConfig, kind string, variation int, values []string) {
	for i := range cfg.Targets {
		if cfg.Targets[i].ContextKind == kind && cfg.Targets[i].Variation == variation {
			cfg.Targets[i].Values = unionStrings(cfg.Targets[i].Values, values)
			return
		}
	}
	cfg.Targets = append(cfg.Targets, models.Target{ContextKind: kind, Values: values, Variation: variation})
}

func removeTargets(cfg *models.FlagConfig, kind string, variation int, values []string) {
	drop := make(map[string]bool, len(values))
	for _, v := range values {
		drop[v] = true
	}
	kept := cfg.Targets[:0]
	for _, t := range cfg.Targets {
		if t.ContextKind == kind && t.Variation == variation {
			var vals []string
			for _, v := range t.Values {
				if !drop[v] {
					vals = append(vals, v)
				}
			}
			if len(vals) == 0 {
				continue // drop empty target
			}
			t.Values = vals
		}
		kept = append(kept, t)
	}
	cfg.Targets = kept
}

func removeRule(rules []models.Rule, id string) []models.Rule {
	out := rules[:0]
	for _, r := range rules {
		if r.ID != id {
			out = append(out, r)
		}
	}
	return out
}

// reorderRules replaces the rule order with ids. It requires ids to be a
// permutation of exactly the existing rule ids — no additions, removals, or
// duplicates — so the operation can't silently drop or clone a rule.
func reorderRules(cfg *models.FlagConfig, ids []string) error {
	if len(ids) != len(cfg.Rules) {
		return fmt.Errorf("reorderRules must list every rule id exactly once")
	}
	byID := make(map[string]models.Rule, len(cfg.Rules))
	for _, r := range cfg.Rules {
		byID[r.ID] = r
	}
	next := make([]models.Rule, 0, len(ids))
	for _, id := range ids {
		r, ok := byID[id]
		if !ok {
			return fmt.Errorf("reorderRules: unknown or duplicate rule id %q", id)
		}
		delete(byID, id) // deleting guards against duplicates in ids
		next = append(next, r)
	}
	cfg.Rules = next
	return nil
}

func removePrerequisite(prereqs []models.Prerequisite, key string) []models.Prerequisite {
	out := prereqs[:0]
	for _, p := range prereqs {
		if p.Key != key {
			out = append(out, p)
		}
	}
	return out
}

func unionStrings(a, b []string) []string {
	seen := make(map[string]bool, len(a)+len(b))
	out := make([]string, 0, len(a)+len(b))
	for _, s := range append(append([]string{}, a...), b...) {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

func newRuleID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
