package flags

import (
	"crypto/sha1"
	"encoding/hex"
	"strconv"

	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// longScale is the denominator for bucketing: the value of the first 15 hex
// digits of a SHA-1 (60 bits, 2^60-1). Dividing the parsed hash by it yields a
// bucket in [0, 1).
const longScale = float64(0xFFFFFFFFFFFFFFF)

// EvalEnv is the evaluation context of one environment: its flags (for
// prerequisites) and segments (for segmentMatch). It is also the unit cached
// per environment.
type EvalEnv struct {
	Flags    map[string]models.EvalFlag
	Segments map[string]models.Segment
}

// EvaluateFlag resolves a flag value for a context, following the targeting
// order: off → prerequisites → individual targets → rules (first match) →
// fallthrough. env provides prerequisite flags and segments (pass a zero EvalEnv
// if none apply).
func EvaluateFlag(ef models.EvalFlag, ctx models.Context, env EvalEnv) Evaluation {
	return evaluateVisited(ef, ctx, env, map[string]bool{})
}

func evaluateVisited(ef models.EvalFlag, ctx models.Context, env EvalEnv, visited map[string]bool) Evaluation {
	if !ef.On {
		return result(ef, ef.OffVariation, "OFF")
	}

	// Prerequisites: each must be on and evaluate to its required variation.
	if len(ef.Prerequisites) > 0 {
		visited[ef.Key] = true
		defer delete(visited, ef.Key)
		for _, p := range ef.Prerequisites {
			if visited[p.Key] { // circular prerequisite
				return result(ef, ef.OffVariation, "PREREQUISITE_FAILED")
			}
			prereq, ok := env.Flags[p.Key]
			if !ok {
				return result(ef, ef.OffVariation, "PREREQUISITE_FAILED")
			}
			sub := evaluateVisited(prereq, ctx, env, visited)
			// The prerequisite passes only if that flag is on, served a real
			// variation (not its own off/failed path), and matches the required
			// variation.
			if !prereq.On || sub.Reason == "PREREQUISITE_FAILED" || sub.Variation != p.Variation {
				return result(ef, ef.OffVariation, "PREREQUISITE_FAILED")
			}
		}
	}

	// Individual targeting.
	for _, t := range ef.Targets {
		if key, ok := ctx.KeyForKind(t.ContextKind); ok && containsString(t.Values, key) {
			return result(ef, t.Variation, "TARGET_MATCH")
		}
	}

	// Rules, in order; first match wins.
	for _, rule := range ef.Rules {
		if matchRule(rule, ctx, env.Segments) {
			return result(ef, resolveVOR(ef, rule.VariationOrRollout, ctx), "RULE_MATCH")
		}
	}

	// Fallthrough.
	return result(ef, resolveVOR(ef, ef.Fallthrough, ctx), "FALLTHROUGH")
}

// matchRule reports whether every clause matches (AND). An empty rule matches
// nothing.
func matchRule(rule models.Rule, ctx models.Context, segments map[string]models.Segment) bool {
	visited := map[string]bool{}
	for _, c := range rule.Clauses {
		if !matchClauseWithSegments(c, ctx, segments, visited) {
			return false
		}
	}
	return len(rule.Clauses) > 0
}

// matchClauseWithSegments applies a clause, handling segmentMatch specially and
// otherwise resolving the attribute and applying the operator. A missing
// attribute (or unknown segment) is a non-match; array attributes match if any
// element matches; Negate flips the result.
func matchClauseWithSegments(c models.Clause, ctx models.Context, segments map[string]models.Segment, visited map[string]bool) bool {
	if c.Op == models.OpSegmentMatch {
		matched := false
		for _, v := range c.Values {
			key, ok := v.(string)
			if !ok {
				continue
			}
			seg, ok := segments[key]
			if ok && contextInSegment(seg, ctx, segments, visited) {
				matched = true
				break
			}
		}
		if c.Negate {
			return !matched
		}
		return matched
	}

	val, ok := ctx.ValueForRef(c.ContextKind, c.Attribute)
	if !ok {
		return false
	}
	matched := false
	if arr, isArr := val.([]any); isArr {
		for _, elem := range arr {
			if matchOperator(c.Op, elem, c.Values) {
				matched = true
				break
			}
		}
	} else {
		matched = matchOperator(c.Op, val, c.Values)
	}
	if c.Negate {
		return !matched
	}
	return matched
}

// resolveVOR resolves a variation-or-rollout to a variation index.
func resolveVOR(ef models.EvalFlag, vor models.VariationOrRollout, ctx models.Context) int {
	if vor.Variation != nil {
		return *vor.Variation
	}
	if vor.Rollout != nil {
		return bucket(ef, *vor.Rollout, ctx)
	}
	return 0
}

// bucket picks a variation from a rollout by stable hash.
func bucket(ef models.EvalFlag, rollout models.Rollout, ctx models.Context) int {
	if len(rollout.Variations) == 0 {
		return 0
	}
	var prefix string
	if rollout.Seed != nil {
		prefix = strconv.Itoa(*rollout.Seed)
	} else {
		prefix = ef.Key + "." + ef.Salt
	}
	point := computeBucket(prefix, rollout.BucketBy, rollout.ContextKind, ctx)

	var sum float64
	for _, wv := range rollout.Variations {
		sum += float64(wv.Weight) / 100000.0
		if point < sum {
			return wv.Variation
		}
	}
	return rollout.Variations[len(rollout.Variations)-1].Variation
}

// computeBucket hashes a context into [0,1) for rollouts and weighted segments.
// A missing/unbucketable bucketBy value yields 0 (first bucket).
func computeBucket(hashPrefix, bucketBy, contextKind string, ctx models.Context) float64 {
	if bucketBy == "" {
		bucketBy = "key"
	}
	val, ok := ctx.ValueForRef(contextKind, bucketBy)
	if !ok {
		return 0
	}
	str, ok := bucketableString(val)
	if !ok {
		return 0
	}
	sum := sha1.Sum([]byte(hashPrefix + "." + str))
	hexStr := hex.EncodeToString(sum[:])[:15]
	n, err := strconv.ParseUint(hexStr, 16, 64)
	if err != nil {
		return 0
	}
	return float64(n) / longScale
}

// bucketableString renders a value for bucketing. Only strings and integers are
// bucketable; anything else is not.
func bucketableString(v any) (string, bool) {
	switch n := v.(type) {
	case string:
		return n, true
	case float64:
		if n == float64(int64(n)) {
			return strconv.FormatInt(int64(n), 10), true
		}
		return "", false
	case int:
		return strconv.Itoa(n), true
	case int64:
		return strconv.FormatInt(n, 10), true
	default:
		return "", false
	}
}

func containsString(vals []string, target string) bool {
	for _, v := range vals {
		if v == target {
			return true
		}
	}
	return false
}

// result builds an Evaluation for the chosen variation.
func result(ef models.EvalFlag, idx int, reason string) Evaluation {
	return Evaluation{
		FlagKey:   ef.Key,
		Value:     rawValue(ef.Variations, idx),
		Variation: idx,
		Reason:    reason,
	}
}
