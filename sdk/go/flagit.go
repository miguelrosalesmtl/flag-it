// Package flagit is a thin Go client for the flag-it feature-flag service.
//
// Evaluation happens on the server: this client sends a context to the eval
// endpoints and gets back values. It holds no rules and no engine. The client
// is safe for concurrent use.
package flagit

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// EvalContext is an evaluation context. Build a single-kind one with Context,
// or a multi-kind one with MultiContext.
type EvalContext map[string]any

// Evaluation is the result of evaluating one flag. Value is the served JSON value.
type Evaluation struct {
	FlagKey   string `json:"flag_key"`
	Value     any    `json:"value"`
	Variation int    `json:"variation"`
	Reason    string `json:"reason"`
}

// Counter is a rolled-up count of how often a variation was served.
type Counter struct {
	Variation int `json:"variation"`
	Count     int `json:"count"`
}

// EventSummary is rolled-up usage a streaming client reports via SendEvents.
type EventSummary struct {
	Flags map[string]FlagCounters `json:"flags"`
}

// FlagCounters holds the per-variation counters for one flag.
type FlagCounters struct {
	Counters []Counter `json:"counters"`
}

// APIError is returned for a non-2xx API response.
type APIError struct {
	Status int
	Path   string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("flag-it: %s failed with status %d", e.Path, e.Status)
}

// ContextPart is one kind within a multi-kind context.
type ContextPart struct {
	Kind       string
	Key        string
	Attributes map[string]any
}

// Context builds a single-kind context, e.g.
// Context("user", "u1", map[string]any{"plan": "pro"}).
func Context(kind, key string, attributes map[string]any) EvalContext {
	ctx := EvalContext{"kind": kind, "key": key}
	for k, v := range attributes {
		ctx[k] = v
	}
	return ctx
}

// MultiContext builds a multi-kind context, e.g.
// MultiContext(ContextPart{Kind: "user", Key: "u1"}, ContextPart{Kind: "organization", Key: "acme"}).
func MultiContext(parts ...ContextPart) EvalContext {
	ctx := EvalContext{"kind": "multi"}
	for _, p := range parts {
		part := map[string]any{"key": p.Key}
		for k, v := range p.Attributes {
			part[k] = v
		}
		ctx[p.Kind] = part
	}
	return ctx
}

// Options configures a Client.
type Options struct {
	// BaseURL is the service root, e.g. "http://localhost:8080".
	BaseURL string
	// SDKKey is an environment's SDK key (server or client kind).
	SDKKey string
	// HTTPClient overrides the HTTP client used for unary calls. Optional.
	//
	// Streaming uses its own client with no timeout regardless of this value.
	HTTPClient *http.Client
}

// Client is a per-call client: every read hits the server. For a long-lived
// app that reads flags frequently, prefer NewCachedClient.
type Client struct {
	baseURL string
	sdkKey  string
	http    *http.Client
	stream  *http.Client
}

// New creates a Client.
func New(opts Options) *Client {
	httpClient := opts.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &Client{
		baseURL: strings.TrimRight(opts.BaseURL, "/"),
		sdkKey:  opts.SDKKey,
		http:    httpClient,
		// Streaming must never time out; it is a long-lived connection.
		stream: &http.Client{},
	}
}

func (c *Client) request(ctx context.Context, method, path string, body, out any) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("X-SDK-Key", c.sdkKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return &APIError{Status: res.StatusCode, Path: path}
	}
	if out == nil || res.StatusCode == http.StatusNoContent || res.StatusCode == http.StatusAccepted {
		io.Copy(io.Discard, res.Body)
		return nil
	}
	return json.NewDecoder(res.Body).Decode(out)
}

// Evaluate evaluates one flag for a context. It returns an error on a
// network/HTTP failure.
func (c *Client) Evaluate(ctx context.Context, flagKey string, ec EvalContext) (*Evaluation, error) {
	var ev Evaluation
	err := c.request(ctx, http.MethodPost, "/api/v1/eval",
		map[string]any{"flag_key": flagKey, "context": ec}, &ev)
	if err != nil {
		return nil, err
	}
	return &ev, nil
}

// AllFlags evaluates every flag visible to this key in one round-trip.
func (c *Client) AllFlags(ctx context.Context, ec EvalContext) (map[string]Evaluation, error) {
	var out struct {
		Flags map[string]Evaluation `json:"flags"`
	}
	if err := c.request(ctx, http.MethodPost, "/api/v1/eval/all",
		map[string]any{"context": ec}, &out); err != nil {
		return nil, err
	}
	if out.Flags == nil {
		return map[string]Evaluation{}, nil
	}
	return out.Flags, nil
}

func (c *Client) safeValue(ctx context.Context, flagKey string, ec EvalContext) any {
	ev, err := c.Evaluate(ctx, flagKey, ec)
	if err != nil {
		return nil
	}
	return ev.Value
}

// BoolVariation returns the flag's boolean value, or fallback if it is
// unavailable or not a boolean. It never returns an error.
func (c *Client) BoolVariation(ctx context.Context, flagKey string, ec EvalContext, fallback bool) bool {
	if v, ok := c.safeValue(ctx, flagKey, ec).(bool); ok {
		return v
	}
	return fallback
}

// StringVariation returns the flag's string value, or fallback.
func (c *Client) StringVariation(ctx context.Context, flagKey string, ec EvalContext, fallback string) string {
	if v, ok := c.safeValue(ctx, flagKey, ec).(string); ok {
		return v
	}
	return fallback
}

// Float64Variation returns the flag's numeric value, or fallback. JSON numbers
// decode as float64.
func (c *Client) Float64Variation(ctx context.Context, flagKey string, ec EvalContext, fallback float64) float64 {
	if v, ok := c.safeValue(ctx, flagKey, ec).(float64); ok {
		return v
	}
	return fallback
}

// SendEvents reports rolled-up evaluation counts (for clients that read from a
// local stream cache).
func (c *Client) SendEvents(ctx context.Context, summary EventSummary) error {
	return c.request(ctx, http.MethodPost, "/api/v1/events", summary, nil)
}

// StreamOptions configures a stream.
type StreamOptions struct {
	// OnError is called when a stream attempt fails, before the automatic reconnect.
	OnError func(error)
}

// Stream is a live stream. Call Close to stop it and cancel reconnects.
type Stream struct {
	cancel context.CancelFunc
	done   chan struct{}
}

// Close stops the stream.
func (s *Stream) Close() {
	s.cancel()
	<-s.done
}

// Stream opens a live stream. onUpdate fires with the full flag map on the
// initial snapshot and on every change. It auto-reconnects with backoff until
// Close is called.
func (c *Client) Stream(ctx context.Context, ec EvalContext, onUpdate func(map[string]Evaluation), opts *StreamOptions) *Stream {
	ctx, cancel := context.WithCancel(ctx)
	s := &Stream{cancel: cancel, done: make(chan struct{})}
	go func() {
		defer close(s.done)
		c.runStream(ctx, ec, onUpdate, opts)
	}()
	return s
}

func (c *Client) runStream(ctx context.Context, ec EvalContext, onUpdate func(map[string]Evaluation), opts *StreamOptions) {
	backoff := time.Second
	for ctx.Err() == nil {
		err := c.readStreamOnce(ctx, ec, onUpdate)
		if err == nil {
			backoff = time.Second
		} else if ctx.Err() == nil {
			if opts != nil && opts.OnError != nil {
				opts.OnError(err)
			}
		}
		if ctx.Err() != nil {
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		backoff *= 2
		if backoff > 30*time.Second {
			backoff = 30 * time.Second
		}
	}
}

func (c *Client) readStreamOnce(ctx context.Context, ec EvalContext, onUpdate func(map[string]Evaluation)) error {
	raw, err := json.Marshal(ec)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/v1/eval/stream", nil)
	if err != nil {
		return err
	}
	q := req.URL.Query()
	q.Set("context", string(raw))
	req.URL.RawQuery = q.Encode()
	req.Header.Set("X-SDK-Key", c.sdkKey)
	req.Header.Set("Accept", "text/event-stream")

	res, err := c.stream.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return &APIError{Status: res.StatusCode, Path: "/api/v1/eval/stream"}
	}
	return readEventStream(res.Body, func(data string) {
		var payload struct {
			Flags map[string]Evaluation `json:"flags"`
		}
		if json.Unmarshal([]byte(data), &payload) == nil && payload.Flags != nil {
			onUpdate(payload.Flags)
		}
	})
}

// readEventStream reads an SSE body, invoking onData with each event's data payload.
func readEventStream(body io.Reader, onData func(string)) error {
	scanner := bufio.NewScanner(body)
	scanner.Buffer(make([]byte, 0, 64*1024), 1<<20)
	var data []string
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			if len(data) > 0 {
				onData(strings.Join(data, "\n"))
				data = data[:0]
			}
			continue
		}
		if strings.HasPrefix(line, "data:") {
			data = append(data, strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
		}
	}
	if len(data) > 0 {
		onData(strings.Join(data, "\n"))
	}
	return scanner.Err()
}
