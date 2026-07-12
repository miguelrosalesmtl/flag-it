// Package ffclient is a thin Go SDK for the feature-flag service. Evaluation
// happens on the server; this client just calls the eval endpoints, offers typed
// helpers, and can stream live value updates. It holds no rules and no engine.
package ffclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Context is the evaluation subject. Single-kind: NewContext("user","u1", attrs).
// Multi-kind: build the map yourself, e.g.
// {"kind":"multi","user":{"key":"u1"},"org":{"key":"o1"}}.
type Context map[string]any

// NewContext builds a single-kind context (kind defaults to "user").
func NewContext(kind, key string, attrs map[string]any) Context {
	c := Context{"key": key}
	if kind != "" {
		c["kind"] = kind
	}
	for k, v := range attrs {
		c[k] = v
	}
	return c
}

// Evaluation is a single flag result.
type Evaluation struct {
	FlagKey   string `json:"flag_key"`
	Value     any    `json:"value"`
	Variation int    `json:"variation"`
	Reason    string `json:"reason"`
}

// Client talks to the feature-flag service with one environment's SDK key.
type Client struct {
	baseURL string
	sdkKey  string
	http    *http.Client
}

// New returns a client. baseURL is the service root, e.g. http://localhost:8080.
func New(baseURL, sdkKey string, opts ...Option) *Client {
	c := &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		sdkKey:  sdkKey,
		http:    &http.Client{Timeout: 10 * time.Second},
	}
	for _, o := range opts {
		o(c)
	}
	return c
}

// Option customizes a Client.
type Option func(*Client)

// WithHTTPClient sets a custom http.Client.
func WithHTTPClient(h *http.Client) Option { return func(c *Client) { c.http = h } }

// Evaluate resolves one flag for a context.
func (c *Client) Evaluate(ctx context.Context, flagKey string, evalCtx Context) (Evaluation, error) {
	body := map[string]any{"flag_key": flagKey, "context": evalCtx}
	var out Evaluation
	if err := c.post(ctx, "/api/v1/eval", body, &out); err != nil {
		return Evaluation{}, err
	}
	return out, nil
}

// AllFlags evaluates every flag visible to this key for a context, returning a
// flag-key → Evaluation map (the batch path — one round-trip). Also usable for
// bootstrapping a page.
func (c *Client) AllFlags(ctx context.Context, evalCtx Context) (map[string]Evaluation, error) {
	body := map[string]any{"context": evalCtx}
	var out struct {
		Flags map[string]Evaluation `json:"flags"`
	}
	if err := c.post(ctx, "/api/v1/eval/all", body, &out); err != nil {
		return nil, err
	}
	return out.Flags, nil
}

// BoolVariation returns a boolean flag value, or def if unavailable/not boolean.
func (c *Client) BoolVariation(ctx context.Context, flagKey string, evalCtx Context, def bool) bool {
	ev, err := c.Evaluate(ctx, flagKey, evalCtx)
	if err != nil {
		return def
	}
	if b, ok := ev.Value.(bool); ok {
		return b
	}
	return def
}

// StringVariation returns a string flag value, or def if unavailable/not a string.
func (c *Client) StringVariation(ctx context.Context, flagKey string, evalCtx Context, def string) string {
	ev, err := c.Evaluate(ctx, flagKey, evalCtx)
	if err != nil {
		return def
	}
	if s, ok := ev.Value.(string); ok {
		return s
	}
	return def
}

func (c *Client) post(ctx context.Context, path string, body, out any) error {
	buf, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-SDK-Key", c.sdkKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("ffclient: %s %s: status %d", http.MethodPost, path, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}
