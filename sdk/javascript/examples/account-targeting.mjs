// Per-account targeting from a browser/app frontend.
//
// The flag `new-dashboard` is configured on the SERVER with a rule like
// "serve true when organization.key == acme". The frontend does NOT evaluate
// that rule — it only asserts *who* the user is and *which account* they're on
// (a multi-kind context). The server matches the rule and returns just the
// value. A different account sending the same code gets a different answer.
//
// Run with:  FLAG_IT_CLIENT_KEY=sdk-… node account-targeting.mjs
import { createCachedClient, multiContext } from '@flag-it/sdk'

const client = createCachedClient({
  baseUrl: process.env.FLAG_IT_URL ?? 'http://localhost:8080',
  // A *client* key — it only sees flags marked client-side-available. Never
  // ship a server key to a browser.
  sdkKey: process.env.FLAG_IT_CLIENT_KEY,
  context: multiContext(
    { kind: 'user', key: 'u-123', attributes: { plan: 'pro' } },
    { kind: 'organization', key: 'acme' }, // <-- the account being targeted
  ),
})

await client.waitForInitialization()
console.log('new-dashboard for acme:', client.boolVariation('new-dashboard', false)) // → true

// Same code, different identity → different answer. No rules ever left the server.
await client.identify(
  multiContext(
    { kind: 'user', key: 'u-999' },
    { kind: 'organization', key: 'beta' },
  ),
)
console.log('new-dashboard for beta:', client.boolVariation('new-dashboard', false)) // → false

await client.close()
