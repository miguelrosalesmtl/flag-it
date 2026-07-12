package flags

import (
	"encoding/json"
	"fmt"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// validateDefinition checks a flag definition before persistence.
func validateDefinition(key string, variations []json.RawMessage) error {
	if key == "" {
		return invalid("flag key is required")
	}
	if len(variations) == 0 {
		return invalid("flag must define at least one variation")
	}
	return nil
}

// validateConfig checks a per-environment config against the flag's variation
// count: all variation indices in range, rules well-formed, rollouts sum to
// 100000.
func validateConfig(cfg models.FlagConfig, variationCount int) error {
	if !inRange(cfg.OffVariation, variationCount) {
		return invalid("off_variation out of range")
	}
	for i, p := range cfg.Prerequisites {
		if p.Key == "" {
			return invalid(fmt.Sprintf("prerequisite %d: key is required", i))
		}
		// p.Variation indexes the prerequisite flag's variations (not this
		// flag's), so it can't be range-checked here.
	}
	if err := validateVOR(cfg.Fallthrough, variationCount); err != nil {
		return invalid("fallthrough: " + err.Error())
	}
	for i, t := range cfg.Targets {
		if !inRange(t.Variation, variationCount) {
			return invalid(fmt.Sprintf("target %d: variation out of range", i))
		}
	}
	for i, rule := range cfg.Rules {
		if len(rule.Clauses) == 0 {
			return invalid(fmt.Sprintf("rule %d: must have at least one clause", i))
		}
		if err := validateVOR(rule.VariationOrRollout, variationCount); err != nil {
			return invalid(fmt.Sprintf("rule %d: %s", i, err.Error()))
		}
	}
	return nil
}

// validateVOR checks a variation-or-rollout: exactly one is set, indices are in
// range, and rollout weights are non-negative and sum to 100000.
func validateVOR(vor models.VariationOrRollout, variationCount int) error {
	switch {
	case vor.Variation != nil && vor.Rollout != nil:
		return invalidErr("set either variation or rollout, not both")
	case vor.Variation != nil:
		if !inRange(*vor.Variation, variationCount) {
			return invalidErr("variation out of range")
		}
		return nil
	case vor.Rollout != nil:
		r := vor.Rollout
		if len(r.Variations) == 0 {
			return invalidErr("rollout has no variations")
		}
		sum := 0
		for _, wv := range r.Variations {
			if !inRange(wv.Variation, variationCount) {
				return invalidErr("rollout variation out of range")
			}
			if wv.Weight < 0 {
				return invalidErr("rollout weight must be non-negative")
			}
			sum += wv.Weight
		}
		if sum != 100000 {
			return invalidErr("rollout weights must sum to 100000")
		}
		return nil
	default:
		return invalidErr("must set a variation or a rollout")
	}
}

func inRange(idx, n int) bool { return idx >= 0 && idx < n }

// invalidErr is like invalid but returns a plain error for composition inside
// validateConfig (which wraps it with context).
func invalidErr(msg string) error { return &ValidationError{Msg: msg} }
