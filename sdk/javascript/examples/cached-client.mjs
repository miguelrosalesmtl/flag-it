// Cached client: opens one stream, keeps a snapshot in memory, and serves
// synchronous local reads with zero network per read. Use this for anything
// long-lived and read-heavy. Run with:
//   FLAG_IT_SDK_KEY=sdk-… node cached-client.mjs
import { createCachedClient, context } from '@flag-it/sdk'

const client = createCachedClient({
  baseUrl: process.env.FLAG_IT_URL ?? 'http://localhost:8080',
  sdkKey: process.env.FLAG_IT_SDK_KEY,
  context: context('user', 'u-123', { plan: 'pro' }),
})

// Resolves once the first snapshot has streamed in.
await client.waitForInitialization()

// React to live changes pushed over the stream (admin flips a flag, a rollout
// widens, targeting changes) — no reload, no polling.
const unsubscribe = client.onChange(() => {
  console.log('flags changed → new-dashboard:', client.boolVariation('new-dashboard', false))
})

// Synchronous local reads — no await needed for the value, no network:
console.log('new-dashboard:', client.boolVariation('new-dashboard', false))
console.log('tier:', client.stringVariation('pricing-tier', 'free'))

// On logout / account switch, re-point at the new identity:
await client.identify(context('user', 'u-456'))
console.log('after identify → new-dashboard:', client.boolVariation('new-dashboard', false))

// Graceful shutdown flushes a final batch of usage events.
process.on('SIGINT', async () => {
  unsubscribe()
  await client.close()
  process.exit(0)
})
