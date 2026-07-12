/**
 * Dev-only test seam.
 *
 * MSW runs in a service worker, which intercepts fetches *beneath* Playwright's
 * `page.route` — so a test cannot fulfil those requests from the outside. The
 * worker is exposed here instead, letting E2E reset or override handlers at
 * runtime. Populated in `src/mocks/browser.ts`, and only in dev.
 */
declare global {
  interface Window {
    msw?: {
      worker: {
        resetHandlers: () => void
      }
    }
  }
}

export {}
