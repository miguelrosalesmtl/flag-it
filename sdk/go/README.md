# flag-it Go SDK

A thin Go client for the [flag-it](../../README.md) feature-flag service.
**Evaluation happens on the server** — this client sends a context to the eval
endpoints and gets back values. It holds no rules and no engine.

- **Standard library only** — zero dependencies.
- **Concurrency-safe** — share one client across goroutines.
- **Streaming** over `net/http` with automatic reconnect.

## Install

```bash
go get github.com/miguelrosalesmtl/flag-it/sdk/go@latest
```

```go
import flagit "github.com/miguelrosalesmtl/flag-it/sdk/go"
```

## Usage (per-read client)

Every read hits the server. Good for one-off calls, jobs, and serverless.

```go
client := flagit.New(flagit.Options{
    BaseURL: "https://flags.example.com",
    SDKKey:  os.Getenv("FLAG_IT_SDK_KEY"),
})

ctx := context.Background()
user := flagit.Context("user", "u-123", map[string]any{"plan": "pro"})

// Typed reads never error — they return the fallback on failure / type mismatch:
if client.BoolVariation(ctx, "dark-mode", user, false) {
    // …
}
tier := client.StringVariation(ctx, "pricing-tier", user, "free")
limit := client.Float64Variation(ctx, "rate-limit", user, 100)

// Full evaluation (returns an error on a network/HTTP failure):
ev, err := client.Evaluate(ctx, "dark-mode", user)

// Everything at once (one round-trip — good for bootstrapping):
flags, err := client.AllFlags(ctx, user)

// Multi-kind context (e.g. bucket by organization):
mc := flagit.MultiContext(
    flagit.ContextPart{Kind: "user", Key: "u-123"},
    flagit.ContextPart{Kind: "organization", Key: "acme"},
)
```

## Cached client (recommended for high read volume)

`New` hits the server on every read, which does not scale on a hot path.
`NewCachedClient` mirrors how the LaunchDarkly SDKs work: it opens **one**
stream, keeps a full flag snapshot in memory, serves **synchronous local reads
with zero network per read**, and reports usage as **batched summary events**
(default every 5s).

```go
cc := flagit.NewCachedClient(flagit.CachedOptions{
    BaseURL: "https://flags.example.com",
    SDKKey:  os.Getenv("FLAG_IT_SDK_KEY"),
    Context: flagit.Context("user", "u-123", map[string]any{"plan": "pro"}),
})
defer cc.Close()

if err := cc.WaitForInitialization(context.Background()); err != nil {
    log.Fatal(err)
}

// Synchronous — no network:
if cc.BoolVariation("dark-mode", false) {
    // …
}
tier := cc.StringVariation("pricing-tier", "free")

// React to live changes pushed over the stream:
unsubscribe := cc.OnChange(func() { /* re-render */ })
defer unsubscribe()

// Re-point at a different context (e.g. after login):
cc.Identify(context.Background(), flagit.Context("user", "u-456", nil))

cc.Flush(context.Background()) // force-send buffered usage now
```

`CachedOptions`: `FlushInterval` (default 5s; negative disables), `DisableEvents`
(turn off usage reporting), `OnError`.

## Streaming directly

```go
stream := client.Stream(ctx, user, func(flags map[string]flagit.Evaluation) {
    // full snapshot on connect and on every change
}, &flagit.StreamOptions{OnError: func(err error) { log.Println(err) }})
defer stream.Close()
```

## Server vs client SDK keys

Use a **server** SDK key from a backend. Client keys only see flags marked
client-side-available; never ship a server key to an untrusted client.
