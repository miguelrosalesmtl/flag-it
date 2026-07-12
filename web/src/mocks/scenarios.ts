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

  // A fresh install: GET /setup reports needs_setup, so the app opens the wizard.
  // POST /setup succeeds; the wizard seeds the cache to "done" on success, so no
  // refetch sends the user back here — they land in the app.
  'needs-setup': [
    http.get('*/api/v1/setup', () => HttpResponse.json({ needs_setup: true })),
    http.post('*/api/v1/setup', async ({ request }) => {
      const input = (await request.json()) as {
        email: string
        tenant_slug?: string
        tenant_name?: string
      }
      return HttpResponse.json(
        {
          token: 'mock-token',
          user: {
            id: 'u1',
            email: input.email,
            full_name: 'Admin',
            is_superuser: true,
            is_active: true,
            created_at: '2026-07-12T00:00:00Z',
            updated_at: '2026-07-12T00:00:00Z',
          },
          tenant: input.tenant_slug
            ? {
                id: 't1',
                slug: input.tenant_slug,
                name: input.tenant_name ?? input.tenant_slug,
                created_at: '2026-07-12T00:00:00Z',
                updated_at: '2026-07-12T00:00:00Z',
              }
            : undefined,
        },
        { status: 201 },
      )
    }),
  ],

  'login-error': [
    http.post('*/api/v1/auth/login', () => new HttpResponse(null, { status: 401 })),
  ],
}
