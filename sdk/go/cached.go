package flagit

import (
	"context"
	"sync"
	"time"
)

// CachedOptions configures a CachedClient.
type CachedOptions struct {
	// BaseURL is the service root, e.g. "http://localhost:8080".
	BaseURL string
	// SDKKey is an environment's SDK key.
	SDKKey string
	// Context is the evaluation context this client streams and reads for.
	Context EvalContext
	// FlushInterval is how often buffered usage events are sent. 0 uses the
	// default (5s); a negative value disables the background flush.
	FlushInterval time.Duration
	// DisableEvents turns off usage reporting entirely.
	DisableEvents bool
	// OnError is called on a stream or flush error.
	OnError func(error)
}

// CachedClient mirrors the LaunchDarkly-style pattern: it streams flag values
// into an in-memory store once, then serves synchronous local reads with ZERO
// network per read, and reports usage as batched summary events. Use this for a
// long-lived app; use Client for one-off calls.
//
// All methods are safe for concurrent use.
type CachedClient struct {
	base       *Client
	trackEvent bool
	onError    func(error)

	mu        sync.RWMutex
	store     map[string]Evaluation
	ready     bool
	readyCh   chan struct{}
	current   EvalContext
	stream    *Stream
	listeners map[int]func()
	nextID    int
	counts    map[string]map[int]int

	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewCachedClient creates a CachedClient and starts streaming immediately.
func NewCachedClient(opts CachedOptions) *CachedClient {
	onError := opts.OnError
	if onError == nil {
		onError = func(error) {}
	}
	ctx, cancel := context.WithCancel(context.Background())
	c := &CachedClient{
		base:       New(Options{BaseURL: opts.BaseURL, SDKKey: opts.SDKKey}),
		trackEvent: !opts.DisableEvents,
		onError:    onError,
		store:      map[string]Evaluation{},
		readyCh:    make(chan struct{}),
		current:    opts.Context,
		listeners:  map[int]func(){},
		counts:     map[string]map[int]int{},
		cancel:     cancel,
	}
	c.startStream(ctx)

	interval := opts.FlushInterval
	if interval == 0 {
		interval = 5 * time.Second
	}
	if interval > 0 && c.trackEvent {
		c.wg.Add(1)
		go func() {
			defer c.wg.Done()
			ticker := time.NewTicker(interval)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					c.Flush(context.Background())
				}
			}
		}()
	}
	return c
}

func (c *CachedClient) startStream(ctx context.Context) {
	c.stream = c.base.Stream(ctx, c.current, func(flags map[string]Evaluation) {
		c.mu.Lock()
		c.store = flags
		if !c.ready {
			c.ready = true
			close(c.readyCh)
		}
		listeners := make([]func(), 0, len(c.listeners))
		for _, l := range c.listeners {
			listeners = append(listeners, l)
		}
		c.mu.Unlock()
		for _, l := range listeners {
			l()
		}
	}, &StreamOptions{OnError: c.onError})
}

// WaitForInitialization blocks until the initial snapshot arrives or ctx is done.
func (c *CachedClient) WaitForInitialization(ctx context.Context) error {
	c.mu.RLock()
	ch := c.readyCh
	c.mu.RUnlock()
	select {
	case <-ch:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Initialized reports whether the initial snapshot has loaded.
func (c *CachedClient) Initialized() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.ready
}

// OnChange subscribes to store updates and returns an unsubscribe function.
func (c *CachedClient) OnChange(listener func()) func() {
	c.mu.Lock()
	id := c.nextID
	c.nextID++
	c.listeners[id] = listener
	c.mu.Unlock()
	return func() {
		c.mu.Lock()
		delete(c.listeners, id)
		c.mu.Unlock()
	}
}

func (c *CachedClient) read(flagKey string) (Evaluation, bool) {
	c.mu.RLock()
	ev, ok := c.store[flagKey]
	c.mu.RUnlock()
	if ok && c.trackEvent {
		c.mu.Lock()
		byVar := c.counts[flagKey]
		if byVar == nil {
			byVar = map[int]int{}
			c.counts[flagKey] = byVar
		}
		byVar[ev.Variation]++
		c.mu.Unlock()
	}
	return ev, ok
}

// BoolVariation returns the flag's boolean value from the local store, or
// fallback before init / on type mismatch. It performs no network I/O.
func (c *CachedClient) BoolVariation(flagKey string, fallback bool) bool {
	if ev, ok := c.read(flagKey); ok {
		if v, ok := ev.Value.(bool); ok {
			return v
		}
	}
	return fallback
}

// StringVariation returns the flag's string value from the local store, or fallback.
func (c *CachedClient) StringVariation(flagKey string, fallback string) string {
	if ev, ok := c.read(flagKey); ok {
		if v, ok := ev.Value.(string); ok {
			return v
		}
	}
	return fallback
}

// Float64Variation returns the flag's numeric value from the local store, or fallback.
func (c *CachedClient) Float64Variation(flagKey string, fallback float64) float64 {
	if ev, ok := c.read(flagKey); ok {
		if v, ok := ev.Value.(float64); ok {
			return v
		}
	}
	return fallback
}

// AllFlags returns a snapshot of all cached evaluations.
func (c *CachedClient) AllFlags() map[string]Evaluation {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[string]Evaluation, len(c.store))
	for k, v := range c.store {
		out[k] = v
	}
	return out
}

// Flush sends buffered usage events now.
func (c *CachedClient) Flush(ctx context.Context) error {
	c.mu.Lock()
	if len(c.counts) == 0 {
		c.mu.Unlock()
		return nil
	}
	summary := EventSummary{Flags: map[string]FlagCounters{}}
	for flagKey, byVar := range c.counts {
		counters := make([]Counter, 0, len(byVar))
		for variation, count := range byVar {
			counters = append(counters, Counter{Variation: variation, Count: count})
		}
		summary.Flags[flagKey] = FlagCounters{Counters: counters}
	}
	c.counts = map[string]map[int]int{}
	c.mu.Unlock()

	if err := c.base.SendEvents(ctx, summary); err != nil {
		c.onError(err)
		return err
	}
	return nil
}

// Identify switches to a new context: it flushes, reconnects the stream, and
// blocks until the new snapshot arrives or ctx is done.
func (c *CachedClient) Identify(ctx context.Context, ec EvalContext) error {
	c.Flush(ctx)
	c.stream.Close()

	c.mu.Lock()
	c.store = map[string]Evaluation{}
	c.ready = false
	c.readyCh = make(chan struct{})
	c.current = ec
	c.mu.Unlock()

	c.startStream(context.Background())
	return c.WaitForInitialization(ctx)
}

// Close stops streaming, flushes a final time, and releases resources.
func (c *CachedClient) Close() error {
	c.cancel()
	if c.stream != nil {
		c.stream.Close()
	}
	c.wg.Wait()
	return c.Flush(context.Background())
}
