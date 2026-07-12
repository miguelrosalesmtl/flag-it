package flags

import (
	"regexp"
	"time"

	"github.com/Masterminds/semver/v3"
	"github.com/miguelrosalesmtl/flag-it/internal/models"
)

// matchOperator reports whether contextVal satisfies op against any of the
// clause values (OR across values).
func matchOperator(op models.Operator, contextVal any, clauseVals []any) bool {
	for _, cv := range clauseVals {
		if opMatch(op, contextVal, cv) {
			return true
		}
	}
	return false
}

func opMatch(op models.Operator, a, b any) bool {
	switch op {
	case models.OpIn:
		return jsonEqual(a, b)
	case models.OpStartsWith:
		as, bs, ok := twoStrings(a, b)
		return ok && len(as) >= len(bs) && as[:len(bs)] == bs
	case models.OpEndsWith:
		as, bs, ok := twoStrings(a, b)
		return ok && len(as) >= len(bs) && as[len(as)-len(bs):] == bs
	case models.OpContains:
		as, bs, ok := twoStrings(a, b)
		return ok && containsStr(as, bs)
	case models.OpMatches:
		as, pattern, ok := twoStrings(a, b)
		if !ok {
			return false
		}
		re, err := regexp.Compile(pattern)
		return err == nil && re.MatchString(as)
	case models.OpLessThan:
		af, bf, ok := twoFloats(a, b)
		return ok && af < bf
	case models.OpLessThanOrEqual:
		af, bf, ok := twoFloats(a, b)
		return ok && af <= bf
	case models.OpGreaterThan:
		af, bf, ok := twoFloats(a, b)
		return ok && af > bf
	case models.OpGreaterThanOrEqual:
		af, bf, ok := twoFloats(a, b)
		return ok && af >= bf
	case models.OpBefore:
		at, bt, ok := twoTimes(a, b)
		return ok && at.Before(bt)
	case models.OpAfter:
		at, bt, ok := twoTimes(a, b)
		return ok && at.After(bt)
	case models.OpSemVerEqual:
		return semverCompare(a, b, func(c int) bool { return c == 0 })
	case models.OpSemVerLessThan:
		return semverCompare(a, b, func(c int) bool { return c < 0 })
	case models.OpSemVerGreaterThan:
		return semverCompare(a, b, func(c int) bool { return c > 0 })
	case models.OpSegmentMatch:
		// Segments are Phase 2; unresolved segmentMatch never matches for now.
		return false
	default:
		return false
	}
}

func containsStr(s, sub string) bool {
	if sub == "" {
		return true
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// jsonEqual compares two JSON-ish values, treating all numbers as equal by value.
func jsonEqual(a, b any) bool {
	if af, aok := toFloat(a); aok {
		bf, bok := toFloat(b)
		return bok && af == bf
	}
	return a == b
}

func twoStrings(a, b any) (string, string, bool) {
	as, aok := a.(string)
	bs, bok := b.(string)
	return as, bs, aok && bok
}

func twoFloats(a, b any) (float64, float64, bool) {
	af, aok := toFloat(a)
	bf, bok := toFloat(b)
	return af, bf, aok && bok
}

func toFloat(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	default:
		return 0, false
	}
}

// twoTimes parses both operands as timestamps (RFC3339 string or Unix millis).
func twoTimes(a, b any) (time.Time, time.Time, bool) {
	at, aok := toTime(a)
	bt, bok := toTime(b)
	return at, bt, aok && bok
}

func toTime(v any) (time.Time, bool) {
	switch t := v.(type) {
	case string:
		parsed, err := time.Parse(time.RFC3339, t)
		return parsed, err == nil
	case float64:
		return time.UnixMilli(int64(t)), true
	case int:
		return time.UnixMilli(int64(t)), true
	case int64:
		return time.UnixMilli(t), true
	default:
		return time.Time{}, false
	}
}

func semverCompare(a, b any, pred func(int) bool) bool {
	av, aok := toSemver(a)
	bv, bok := toSemver(b)
	if !aok || !bok {
		return false
	}
	return pred(av.Compare(bv))
}

func toSemver(v any) (*semver.Version, bool) {
	s, ok := v.(string)
	if !ok {
		return nil, false
	}
	ver, err := semver.NewVersion(s)
	if err != nil {
		return nil, false
	}
	return ver, true
}
