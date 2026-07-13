package models

import (
	"encoding/json"
	"strings"
)

// Context is the subject a flag is evaluated for. It supports multi-kind
// contexts: a single-kind context has a kind, key, and attributes; a multi
// context bundles several single contexts by kind (e.g. a user and their org).
//
// JSON forms accepted:
//
//	{"kind":"user","key":"u1","name":"Sandy"}                    // single
//	{"kind":"multi","user":{"key":"u1"},"org":{"key":"o1"}}      // multi
//	{"key":"u1","name":"Sandy"}                                   // legacy → user
type Context struct {
	single map[string]singleContext // kind -> context
}

type singleContext struct {
	Key        string
	Attributes map[string]any
}

// UnmarshalJSON parses the single, multi, and legacy forms.
func (c *Context) UnmarshalJSON(data []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	c.single = map[string]singleContext{}

	kind := "user"
	if k, ok := raw["kind"]; ok {
		var ks string
		if err := json.Unmarshal(k, &ks); err != nil {
			return err
		}
		kind = ks
	}

	if kind == "multi" {
		for k, v := range raw {
			if k == "kind" {
				continue
			}
			var sub map[string]json.RawMessage
			if err := json.Unmarshal(v, &sub); err != nil {
				return err
			}
			c.single[k] = parseSingle(sub)
		}
		return nil
	}
	c.single[kind] = parseSingle(raw)
	return nil
}

func parseSingle(raw map[string]json.RawMessage) singleContext {
	sc := singleContext{Attributes: map[string]any{}}
	for k, v := range raw {
		switch k {
		case "kind":
			// sub-context kind is implied by its position; ignore any explicit one
		case "key":
			var s string
			_ = json.Unmarshal(v, &s)
			sc.Key = s
		case "_meta":
			// privateAttributes handled at redaction time (not yet implemented)
		default:
			var val any
			_ = json.Unmarshal(v, &val)
			sc.Attributes[k] = val
		}
	}
	return sc
}

// NewSingleContext builds a single-kind context (kind defaults to "user").
func NewSingleContext(kind, key string, attrs map[string]any) Context {
	if kind == "" {
		kind = "user"
	}
	if attrs == nil {
		attrs = map[string]any{}
	}
	return Context{single: map[string]singleContext{kind: {Key: key, Attributes: attrs}}}
}

// NewMultiContext builds a multi-kind context from single-kind contexts.
func NewMultiContext(parts ...Context) Context {
	out := Context{single: map[string]singleContext{}}
	for _, p := range parts {
		for kind, sc := range p.single {
			out.single[kind] = sc
		}
	}
	return out
}

// IsEmpty reports whether the context carries no kinds (e.g. an absent body).
func (c Context) IsEmpty() bool { return len(c.single) == 0 }

// ContextPart is one kind's identity and attributes within a context.
type ContextPart struct {
	Kind       string
	Key        string
	Attributes map[string]any
}

// Parts returns each kind's (key, attributes) — used to record which contexts
// have been seen during evaluation.
func (c Context) Parts() []ContextPart {
	out := make([]ContextPart, 0, len(c.single))
	for kind, sc := range c.single {
		out = append(out, ContextPart{Kind: kind, Key: sc.Key, Attributes: sc.Attributes})
	}
	return out
}

// KeyForKind returns the key of the given kind's context (kind "" means "user").
func (c Context) KeyForKind(kind string) (string, bool) {
	sc, ok := c.single[defaultKind(kind)]
	return sc.Key, ok
}

// ValueForRef resolves an attribute reference within a kind's context. "key" and
// "kind" are reserved; a ref beginning with "/" is a nested path (e.g.
// "/address/city"); otherwise it is a top-level attribute name.
func (c Context) ValueForRef(kind, ref string) (any, bool) {
	sc, ok := c.single[defaultKind(kind)]
	if !ok {
		return nil, false
	}
	switch ref {
	case "key":
		return sc.Key, true
	case "kind":
		return defaultKind(kind), true
	}
	if strings.HasPrefix(ref, "/") {
		return resolvePath(sc.Attributes, ref)
	}
	v, ok := sc.Attributes[ref]
	return v, ok
}

func resolvePath(attrs map[string]any, ref string) (any, bool) {
	parts := strings.Split(strings.TrimPrefix(ref, "/"), "/")
	var cur any = attrs
	for _, p := range parts {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil, false
		}
		cur, ok = m[p]
		if !ok {
			return nil, false
		}
	}
	return cur, true
}

func defaultKind(kind string) string {
	if kind == "" {
		return "user"
	}
	return kind
}
