import { HttpResponse, http, type RequestHandler } from 'msw'

/**
 * Named failure modes for the mock API.
 *
 * Activate one with a query param — `?scenario=users-error` — in the dev server
 * or in Playwright. It is how you look at an error state in a real browser
 * without breaking a real backend, and how E2E covers paths a happy-path fixture
 * can never reach.
 */
export const scenarios: Record<string, RequestHandler[]> = {
  'users-error': [http.get('/api/users', () => new HttpResponse(null, { status: 500 }))],

  'users-empty': [http.get('/api/users', () => HttpResponse.json([]))],

  'users-slow': [
    http.get('/api/users', async () => {
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return HttpResponse.json([])
    }),
  ],
}
