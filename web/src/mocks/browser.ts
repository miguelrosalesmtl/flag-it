import { setupWorker } from 'msw/browser'

import { handlers } from '@/mocks/handlers'
import { scenarios } from '@/mocks/scenarios'

export const worker = setupWorker(...handlers)

/**
 * Start MSW, applying any scenario named in the URL (`?scenario=users-error`).
 *
 * The worker is also parked on `window.msw` so a test can reset or override
 * handlers at runtime. A service worker intercepts fetches *beneath* Playwright's
 * `page.route`, so this is the seam that lets tests reach the mock API at all.
 */
export async function startWorker(): Promise<void> {
  await worker.start({ onUnhandledRequest: 'bypass' })

  const scenario = new URLSearchParams(window.location.search).get('scenario')
  if (scenario) {
    const scenarioHandlers = scenarios[scenario]
    if (scenarioHandlers) {
      worker.use(...scenarioHandlers)
      console.info(`[msw] scenario active: ${scenario}`)
    } else {
      console.warn(
        `[msw] unknown scenario "${scenario}". Known: ${Object.keys(scenarios).join(', ')}`,
      )
    }
  }

  window.msw = { worker }
}
