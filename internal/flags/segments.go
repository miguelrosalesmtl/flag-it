package flags

import "github.com/miguelrosalesmtl/flag-it/internal/models"

// contextInSegment reports whether a context is a member of a segment.
//
// Order: excluded (short-circuits to non-member) → included (member) → rules in
// order (first matching rule includes; a weighted rule includes only its bucket
// fraction). segments/visited support nested segmentMatch clauses inside segment
// rules, with a cycle guard.
func contextInSegment(seg models.Segment, ctx models.Context, segments map[string]models.Segment, visited map[string]bool) bool {
	if visited[seg.Key] {
		return false // cycle guard
	}
	visited[seg.Key] = true
	defer delete(visited, seg.Key)

	if segmentTargetsContext(seg.Excluded, seg.ExcludedContexts, ctx) {
		return false
	}
	if segmentTargetsContext(seg.Included, seg.IncludedContexts, ctx) {
		return true
	}

	for _, rule := range seg.Rules {
		if !segmentRuleClausesMatch(rule.Clauses, ctx, segments, visited) {
			continue
		}
		if rule.Weight == nil {
			return true
		}
		prefix := seg.Key + "." + seg.Salt
		return computeBucket(prefix, rule.BucketBy, rule.RolloutContextKind, ctx) < float64(*rule.Weight)/100000.0
	}
	return false
}

// segmentTargetsContext reports whether the context's user key is in userKeys,
// or any of its kinds' keys are in the matching SegmentTarget.
func segmentTargetsContext(userKeys []string, targets []models.SegmentTarget, ctx models.Context) bool {
	if key, ok := ctx.KeyForKind("user"); ok && containsString(userKeys, key) {
		return true
	}
	for _, t := range targets {
		if key, ok := ctx.KeyForKind(t.ContextKind); ok && containsString(t.Values, key) {
			return true
		}
	}
	return false
}

// segmentRuleClausesMatch is matchRule for segment rules (all clauses AND), with
// segment context threaded through for nested segmentMatch.
func segmentRuleClausesMatch(clauses []models.Clause, ctx models.Context, segments map[string]models.Segment, visited map[string]bool) bool {
	for _, c := range clauses {
		if !matchClauseWithSegments(c, ctx, segments, visited) {
			return false
		}
	}
	return len(clauses) > 0
}
