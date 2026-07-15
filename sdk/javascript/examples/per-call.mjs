// Per-call client: every read is one request to the server. Good for scripts,
// jobs, and serverless. Run with:  FLAG_IT_SDK_KEY=sdk-… node per-call.mjs
import { createClient, context } from '@flag-it/sdk'

const client = createClient({
  baseUrl: process.env.FLAG_IT_URL ?? 'http://localhost:8080',
  sdkKey: process.env.FLAG_IT_SDK_KEY,
})

const user = context('user', 'u-123', { plan: 'pro' })

// Typed read — never throws, returns the fallback on error / type mismatch:
console.log('new-dashboard:', await client.boolVariation('new-dashboard', user, false))

// Full evaluation — value + variation index + reason (throws on a network error):
const ev = await client.evaluate('new-dashboard', user)
console.log('detail:', ev.value, ev.variation, ev.reason)

// Everything at once — one round-trip, good for bootstrapping a page:
const all = await client.allFlags(user)
console.log('all flags:', Object.keys(all))
