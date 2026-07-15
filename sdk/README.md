# flag-it SDKs

Client SDKs for the [flag-it](../README.md) feature-flag service, one folder per
language. They all speak the same server API and share the same design:

- **Evaluation happens on the server.** The SDK sends an evaluation *context*
  and gets back values — it holds no rules and no engine. The ruleset is never
  shipped to a client.
- **Two clients per language:**
  - a **per-call client** — every read is one request; good for scripts, jobs,
    and serverless;
  - a **cached client** — opens one stream, keeps a full flag snapshot in
    memory, serves **synchronous local reads with zero network per read**, and
    reports usage as **batched summary events** (the LaunchDarkly-style pattern).
    Use this for anything long-lived and read-heavy.
- **Zero third-party dependencies** — each SDK uses only its language's standard
  library / runtime.

## Languages

| SDK | Folder | Notes |
| --- | --- | --- |
| JavaScript / TypeScript | [`javascript/`](./javascript/README.md) | Isomorphic (browser + Node 18+); streams over `fetch` |
| Go | [`go/`](./go/README.md) | `net/http`; concurrency-safe; Go 1.21+ |
| Python | [`python/`](./python/README.md) | `urllib` + `threading`; thread-safe; Python 3.8+ |

## Shared concepts

**Context** — who/what you're evaluating for. Single-kind (a user) or multi-kind
(a user *and* their organization, so you can bucket by either). Every SDK has a
`context(...)` helper and a `multiContext(...)` / `multi_context(...)` helper.

**Typed variations** — `boolVariation` / `stringVariation` / `numberVariation`
(and a raw `variation`) never throw: they return your fallback on any error or
type mismatch. Use `evaluate` / `allFlags` when you want the full result or need
errors surfaced.

**Streaming** — a long-lived connection (Server-Sent Events) that pushes the
full flag map on connect and on every change, with automatic reconnect/backoff.
The cached client is built on top of it.

**Server vs client SDK keys** — mint a key per environment. A **client** key
only sees flags marked client-side-available; a **server** key sees everything.
Never ship a server key to an untrusted client.
