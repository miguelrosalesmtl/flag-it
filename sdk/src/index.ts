/**
 * @flag-it/sdk — a thin JavaScript/TypeScript client for the flag-it service.
 *
 * Evaluation happens on the server: this client sends a context to the eval
 * endpoints and gets back values. It holds no rules and no engine. Works in the
 * browser and in Node 18+ (both provide global `fetch`). Zero dependencies.
 */

/** An evaluation context. Single-kind: use `context()`; multi-kind: `multiContext()`. */
export type EvalContext = Record<string, unknown>

/** The result of evaluating one flag. `value` is the served JSON value. */
export interface Evaluation {
  flag_key: string
  value: unknown
  variation: number
  reason: string
}

/** Rolled-up usage a streaming client reports back via `sendEvents`. */
export interface EventSummary {
  flags: Record<string, { counters: Array<{ variation: number; count: number }> }>
}

export interface ClientOptions {
  /** Service root, e.g. `http://localhost:8080`. */
  baseUrl: string
  /** An environment's SDK key (server or client kind). */
  sdkKey: string
  /** Override the fetch implementation (tests, custom agents). Defaults to global fetch. */
  fetch?: typeof fetch
}

export interface StreamOptions {
  /** Called when a stream attempt errors (before the automatic reconnect). */
  onError?: (error: unknown) => void
}

/** A live stream; call `close()` to stop it (and cancel reconnects). */
export interface StreamHandle {
  close: () => void
}

/** Thrown for a non-2xx API response. */
export class FlagItError extends Error {
  readonly status: number
  constructor(status: number, path: string) {
    super(`flag-it: ${path} failed with status ${status}`)
    this.name = 'FlagItError'
    this.status = status
  }
}

/** Build a single-kind context (e.g. `context('user', 'u1', { plan: 'pro' })`). */
export function context(
  kind: string,
  key: string,
  attributes: Record<string, unknown> = {},
): EvalContext {
  return { kind, key, ...attributes }
}

/**
 * Build a multi-kind context, e.g.
 * `multiContext({ kind: 'user', key: 'u1' }, { kind: 'organization', key: 'acme' })`.
 */
export function multiContext(
  ...parts: Array<{ kind: string; key: string; attributes?: Record<string, unknown> }>
): EvalContext {
  const ctx: EvalContext = { kind: 'multi' }
  for (const p of parts) ctx[p.kind] = { key: p.key, ...(p.attributes ?? {}) }
  return ctx
}

export interface Client {
  /** Evaluate one flag for a context. Throws on a network/HTTP error. */
  evaluate(flagKey: string, ctx: EvalContext): Promise<Evaluation>
  /** Evaluate every flag visible to this key (one round-trip). Good for bootstrapping. */
  allFlags(ctx: EvalContext): Promise<Record<string, Evaluation>>
  /** Boolean value, or `fallback` if unavailable / not a boolean. Never throws. */
  boolVariation(flagKey: string, ctx: EvalContext, fallback: boolean): Promise<boolean>
  /** String value, or `fallback` if unavailable / not a string. Never throws. */
  stringVariation(flagKey: string, ctx: EvalContext, fallback: string): Promise<string>
  /** Numeric value, or `fallback` if unavailable / not a number. Never throws. */
  numberVariation(flagKey: string, ctx: EvalContext, fallback: number): Promise<number>
  /** Value cast to `T`, or `fallback` if unavailable. Never throws. */
  variation<T>(flagKey: string, ctx: EvalContext, fallback: T): Promise<T>
  /**
   * Open a live stream. `onUpdate` fires with the full flag map on the initial
   * snapshot and on every change. Auto-reconnects with backoff until `close()`.
   */
  stream(
    ctx: EvalContext,
    onUpdate: (flags: Record<string, Evaluation>) => void,
    options?: StreamOptions,
  ): StreamHandle
  /** Report rolled-up evaluation counts (for clients that read from a local stream cache). */
  sendEvents(summary: EventSummary): Promise<void>
}

export function createClient(options: ClientOptions): Client {
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const sdkKey = options.sdkKey
  const doFetch = options.fetch ?? globalThis.fetch
  if (typeof doFetch !== 'function') {
    throw new Error('flag-it: no fetch available — pass options.fetch on older runtimes')
  }

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await doFetch(baseUrl + path, {
      method,
      headers: {
        'X-SDK-Key': sdkKey,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) throw new FlagItError(res.status, path)
    if (res.status === 202 || res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  async function evaluate(flagKey: string, ctx: EvalContext): Promise<Evaluation> {
    return request<Evaluation>('POST', '/api/v1/eval', { flag_key: flagKey, context: ctx })
  }

  async function safeValue(flagKey: string, ctx: EvalContext): Promise<unknown> {
    try {
      return (await evaluate(flagKey, ctx)).value
    } catch {
      return undefined
    }
  }

  function stream(
    ctx: EvalContext,
    onUpdate: (flags: Record<string, Evaluation>) => void,
    streamOptions?: StreamOptions,
  ): StreamHandle {
    const controller = new AbortController()
    let closed = false

    async function run(): Promise<void> {
      let backoff = 1000
      while (!closed) {
        try {
          const url = `${baseUrl}/api/v1/eval/stream?context=${encodeURIComponent(JSON.stringify(ctx))}`
          const res = await doFetch(url, {
            method: 'GET',
            headers: { 'X-SDK-Key': sdkKey, Accept: 'text/event-stream' },
            signal: controller.signal,
          })
          if (!res.ok || !res.body) throw new FlagItError(res.status, '/api/v1/eval/stream')
          backoff = 1000
          await readEventStream(res.body, (data) => {
            try {
              const payload = JSON.parse(data) as { flags?: Record<string, Evaluation> }
              if (payload.flags) onUpdate(payload.flags)
            } catch {
              /* skip malformed event */
            }
          })
        } catch (err) {
          if (closed || controller.signal.aborted) return
          streamOptions?.onError?.(err)
        }
        if (closed) return
        await delay(backoff)
        backoff = Math.min(backoff * 2, 30_000)
      }
    }

    void run()
    return {
      close() {
        closed = true
        controller.abort()
      },
    }
  }

  return {
    evaluate,
    async allFlags(ctx) {
      const out = await request<{ flags?: Record<string, Evaluation> }>('POST', '/api/v1/eval/all', {
        context: ctx,
      })
      return out.flags ?? {}
    },
    async boolVariation(flagKey, ctx, fallback) {
      const v = await safeValue(flagKey, ctx)
      return typeof v === 'boolean' ? v : fallback
    },
    async stringVariation(flagKey, ctx, fallback) {
      const v = await safeValue(flagKey, ctx)
      return typeof v === 'string' ? v : fallback
    },
    async numberVariation(flagKey, ctx, fallback) {
      const v = await safeValue(flagKey, ctx)
      return typeof v === 'number' ? v : fallback
    },
    async variation<T>(flagKey: string, ctx: EvalContext, fallback: T): Promise<T> {
      const v = await safeValue(flagKey, ctx)
      return v === undefined ? fallback : (v as T)
    },
    stream,
    async sendEvents(summary) {
      await request<void>('POST', '/api/v1/events', summary)
    },
  }
}

// ---------------------------------------------------------------------------
// Cached client — the LaunchDarkly-style pattern: stream flag values into an
// in-memory store once, then read locally with ZERO network per read, and
// report usage as batched summary events. Use this for a long-lived app; use
// `createClient` for one-off / serverless calls.
// ---------------------------------------------------------------------------

export interface CachedClientOptions {
  /** Service root, e.g. `http://localhost:8080`. */
  baseUrl: string
  /** An environment's SDK key. */
  sdkKey: string
  /** The evaluation context this client streams and reads for. */
  context: EvalContext
  /** Override the fetch implementation. Defaults to global fetch. */
  fetch?: typeof fetch
  /** How often to flush buffered usage events, in ms. 0 disables. Default 5000. */
  flushIntervalMs?: number
  /** Report evaluation usage back to the server as summary events. Default true. */
  sendEvents?: boolean
  /** Called on a stream error (before the automatic reconnect). */
  onError?: (error: unknown) => void
}

export interface CachedClient {
  /** Resolves once the initial flag snapshot has arrived. */
  waitForInitialization(): Promise<void>
  /** Whether the initial snapshot has loaded. */
  initialized(): boolean
  /** Subscribe to store updates; returns an unsubscribe function. */
  onChange(listener: () => void): () => void

  /** Synchronous local read — no network. Returns `fallback` before init / on type mismatch. */
  boolVariation(flagKey: string, fallback: boolean): boolean
  stringVariation(flagKey: string, fallback: string): string
  numberVariation(flagKey: string, fallback: number): number
  variation<T>(flagKey: string, fallback: T): T
  /** A snapshot of all cached evaluations. */
  allFlags(): Record<string, Evaluation>

  /** Switch to a new context: flushes, reconnects the stream, resolves on the new snapshot. */
  identify(context: EvalContext): Promise<void>
  /** Flush buffered usage events now. */
  flush(): Promise<void>
  /** Stop streaming and flush a final time. */
  close(): Promise<void>
}

export function createCachedClient(options: CachedClientOptions): CachedClient {
  const base = createClient({
    baseUrl: options.baseUrl,
    sdkKey: options.sdkKey,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  })
  const flushIntervalMs = options.flushIntervalMs ?? 5000
  const trackEvents = options.sendEvents ?? true
  const onError = options.onError ?? (() => {})

  let store: Record<string, Evaluation> = {}
  let ready = false
  let currentContext = options.context
  let handle: StreamHandle | null = null
  const listeners = new Set<() => void>()
  let readyResolvers: Array<() => void> = []
  // Buffered usage: flagKey -> variation -> count.
  const counts = new Map<string, Map<number, number>>()

  function markReady(): void {
    ready = true
    const resolvers = readyResolvers
    readyResolvers = []
    for (const resolve of resolvers) resolve()
  }

  function startStream(): void {
    handle = base.stream(
      currentContext,
      (flags) => {
        store = flags
        if (!ready) markReady()
        for (const listener of listeners) listener()
      },
      { onError },
    )
  }

  function record(flagKey: string, variation: number): void {
    if (!trackEvents) return
    let byVariation = counts.get(flagKey)
    if (!byVariation) {
      byVariation = new Map()
      counts.set(flagKey, byVariation)
    }
    byVariation.set(variation, (byVariation.get(variation) ?? 0) + 1)
  }

  function read(flagKey: string): Evaluation | undefined {
    const ev = store[flagKey]
    if (ev) record(flagKey, ev.variation)
    return ev
  }

  async function flush(): Promise<void> {
    if (counts.size === 0) return
    const summary: EventSummary = { flags: {} }
    for (const [flagKey, byVariation] of counts) {
      summary.flags[flagKey] = {
        counters: [...byVariation].map(([variation, count]) => ({ variation, count })),
      }
    }
    counts.clear()
    try {
      await base.sendEvents(summary)
    } catch (err) {
      onError(err)
    }
  }

  startStream()

  const timer =
    flushIntervalMs > 0 && trackEvents
      ? setInterval(() => {
          void flush()
        }, flushIntervalMs)
      : null
  // In Node, don't let the flush timer keep the process alive.
  if (timer !== null) {
    ;(timer as unknown as { unref?: () => void }).unref?.()
  }

  return {
    waitForInitialization() {
      if (ready) return Promise.resolve()
      return new Promise<void>((resolve) => readyResolvers.push(resolve))
    },
    initialized: () => ready,
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    boolVariation(flagKey, fallback) {
      const ev = read(flagKey)
      return ev && typeof ev.value === 'boolean' ? ev.value : fallback
    },
    stringVariation(flagKey, fallback) {
      const ev = read(flagKey)
      return ev && typeof ev.value === 'string' ? ev.value : fallback
    },
    numberVariation(flagKey, fallback) {
      const ev = read(flagKey)
      return ev && typeof ev.value === 'number' ? ev.value : fallback
    },
    variation<T>(flagKey: string, fallback: T): T {
      const ev = read(flagKey)
      return ev ? (ev.value as T) : fallback
    },
    allFlags() {
      return { ...store }
    },
    async identify(context) {
      await flush()
      handle?.close()
      store = {}
      ready = false
      currentContext = context
      const done = new Promise<void>((resolve) => readyResolvers.push(resolve))
      startStream()
      return done
    },
    flush,
    async close() {
      if (timer !== null) clearInterval(timer)
      handle?.close()
      await flush()
    },
  }
}

/** Reads a Server-Sent Events body, invoking `onData` with each event's data payload. */
async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const data = rawEvent
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).replace(/^ /, ''))
        .join('\n')
      if (data) onData(data)
      boundary = buffer.indexOf('\n\n')
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
