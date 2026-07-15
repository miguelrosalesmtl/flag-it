# @flag-it/sdk

A thin JavaScript / TypeScript SDK for the [flag-it](../README.md) feature-flag
service. **Evaluation happens on the server** — this client sends a context to
the eval endpoints and gets back values. It holds no rules and no engine.

- **Isomorphic** — works in the browser and in Node 18+ (both provide global `fetch`).
- **Zero dependencies.**
- **Streaming** over `fetch` (not `EventSource`, which can't send the SDK-key header),
  with automatic reconnect.

## Install & build

```bash
cd sdk
npm install
npm run build     # emits dist/ (ESM + .d.ts)
```

## Usage

```ts
import { createClient, context, multiContext } from '@flag-it/sdk'

const client = createClient({
  baseUrl: 'https://flags.example.com', // the flag-it service root
  sdkKey: process.env.FLAG_IT_SDK_KEY!, // minted per environment
})

const user = context('user', 'u-123', { plan: 'pro', country: 'US' })

// Typed reads (never throw — return the fallback on error / type mismatch):
if (await client.boolVariation('dark-mode', user, false)) {
  // …
}
const tier = await client.stringVariation('pricing-tier', user, 'free')

// Full evaluation (throws on a network/HTTP error):
const ev = await client.evaluate('dark-mode', user)
console.log(ev.value, ev.variation, ev.reason)

// Everything at once (one round-trip — good for bootstrapping a page):
const flags = await client.allFlags(user)

// Multi-kind context (e.g. bucket by organization):
const ctx = multiContext(
  { kind: 'user', key: 'u-123' },
  { kind: 'organization', key: 'acme' },
)
```

### Streaming

Keep a local cache updated in real time. `onUpdate` fires with the full flag map
on the initial snapshot and on every change; it auto-reconnects with backoff.

```ts
let cache: Record<string, { value: unknown }> = {}

const stream = client.stream(user, (flags) => {
  cache = flags
})

// later:
stream.close()
```

## Cached client (recommended for high read volume)

`createClient` hits the server on every read. For hot paths — a request handler
that reads flags on every request — that is one network round-trip per read, which
does not scale. `createCachedClient` mirrors how the LaunchDarkly SDKs work:

- It opens **one** stream and keeps a full flag snapshot in memory.
- Reads are **synchronous and local** — zero network per read.
- Evaluation usage is **buffered and flushed as batched summary events** (default
  every 5s), so 10k reads cost one small event payload, not 10k requests.

```ts
import { createCachedClient, context } from '@flag-it/sdk'

const client = createCachedClient({
  baseUrl: 'https://flags.example.com',
  sdkKey: process.env.FLAG_IT_SDK_KEY!,
  context: context('user', 'u-123', { plan: 'pro' }),
})

await client.waitForInitialization() // resolves once the first snapshot arrives

// Synchronous — no await, no network:
if (client.boolVariation('dark-mode', false)) {
  // …
}
const tier = client.stringVariation('pricing-tier', 'free')
const all = client.allFlags()

// React to live changes pushed over the stream:
const unsubscribe = client.onChange(() => rerender())

// Re-point at a different context (e.g. after login):
await client.identify(context('user', 'u-456'))

await client.flush() // force-send buffered usage now
await client.close() // stop the stream and flush a final batch
```

| Option | Default | Notes |
| --- | --- | --- |
| `context` | — | the context all reads evaluate against |
| `flushIntervalMs` | `5000` | how often buffered usage is sent |
| `sendEvents` | `true` | set `false` to disable usage reporting |
| `onError` | — | called on stream/flush errors (reads still serve the last snapshot) |

| Method | Returns | Notes |
| --- | --- | --- |
| `waitForInitialization()` | `Promise<void>` | resolves on first snapshot |
| `initialized()` | `boolean` | whether a snapshot has arrived |
| `boolVariation(flagKey, fallback)` | `boolean` | synchronous, never throws |
| `stringVariation(flagKey, fallback)` | `string` | synchronous, never throws |
| `numberVariation(flagKey, fallback)` | `number` | synchronous, never throws |
| `variation<T>(flagKey, fallback)` | `T` | synchronous |
| `allFlags()` | `Record<string, Evaluation>` | current snapshot |
| `onChange(listener)` | `() => void` | returns an unsubscribe fn |
| `identify(context)` | `Promise<void>` | re-evaluate against a new context |
| `flush()` | `Promise<void>` | send buffered usage now |
| `close()` | `Promise<void>` | stop the stream, flush a final batch |

## API (per-read client)

| Method | Returns | Notes |
| --- | --- | --- |
| `evaluate(flagKey, ctx)` | `Promise<Evaluation>` | `{ flag_key, value, variation, reason }`; throws on error |
| `allFlags(ctx)` | `Promise<Record<string, Evaluation>>` | one round-trip |
| `boolVariation(flagKey, ctx, fallback)` | `Promise<boolean>` | never throws |
| `stringVariation(flagKey, ctx, fallback)` | `Promise<string>` | never throws |
| `numberVariation(flagKey, ctx, fallback)` | `Promise<number>` | never throws |
| `variation<T>(flagKey, ctx, fallback)` | `Promise<T>` | value cast to `T` |
| `stream(ctx, onUpdate, options?)` | `StreamHandle` | `close()` to stop |
| `sendEvents(summary)` | `Promise<void>` | report usage from a streaming client |

Context helpers: `context(kind, key, attributes?)`, `multiContext(...parts)`.

## Server vs client SDK keys

Use a **server** SDK key from a backend, and a **client** key from a browser
(only flags marked client-side-available are visible to client keys). Everything
in a client bundle is public — never ship a server key to the browser.
