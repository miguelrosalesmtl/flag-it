import { HttpResponse, http } from 'msw'

import type { AuthUser } from '@/types/auth'
import type { SetupInput } from '@/types/setup'
import type { Tenant } from '@/types/tenant'
import type { CreateUserInput, User } from '@/types/user'

const seed: User[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: '2', name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
  { id: '3', name: 'Grace Hopper', email: 'grace@example.com', role: 'admin' },
]

let users: User[] = [...seed]

export function resetUsers() {
  users = [...seed]
}

// --- flag-it backend (auth / setup / tenants) ---

const mockUser: AuthUser = {
  id: 'u1',
  email: 'admin@flag-it.dev',
  full_name: 'Admin',
  is_superuser: true,
  is_active: true,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
}

const seedTenants: Tenant[] = [
  {
    id: 't1',
    slug: 'acme',
    name: 'Acme Inc',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

// Default to a configured install (shows login). Flip `needsSetup` in a scenario
// to exercise the wizard.
let needsSetup = false
let tenants: Tenant[] = [...seedTenants]

export function resetBackend() {
  needsSetup = false
  tenants = [...seedTenants]
}

export const handlers = [
  http.get('/api/users', () => HttpResponse.json(users)),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find((u) => u.id === params.id)
    if (!user) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(user)
  }),

  http.post('/api/users', async ({ request }) => {
    const input = (await request.json()) as CreateUserInput
    const user: User = { ...input, id: crypto.randomUUID() }
    users.push(user)
    return HttpResponse.json(user, { status: 201 })
  }),

  http.delete('/api/users/:id', ({ params }) => {
    users = users.filter((u) => u.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // Wildcard-prefixed so they match whatever absolute apiUrl is configured.
  http.get('*/api/v1/setup', () => HttpResponse.json({ needs_setup: needsSetup })),

  http.post('*/api/v1/setup', async ({ request }) => {
    if (!needsSetup) {
      return HttpResponse.json({ title: 'Conflict', detail: 'setup already complete' }, { status: 409 })
    }
    const input = (await request.json()) as SetupInput
    needsSetup = false
    const tenant: Tenant | undefined = input.tenant_slug
      ? {
          id: crypto.randomUUID(),
          slug: input.tenant_slug,
          name: input.tenant_name ?? input.tenant_slug,
          created_at: '2026-07-12T00:00:00Z',
          updated_at: '2026-07-12T00:00:00Z',
        }
      : undefined
    tenants = tenant ? [tenant] : []
    return HttpResponse.json(
      { token: 'mock-token', user: { ...mockUser, email: input.email }, tenant },
      { status: 201 },
    )
  }),

  http.post('*/api/v1/auth/login', () =>
    HttpResponse.json({ token: 'mock-token', user: mockUser }),
  ),

  http.get('*/api/v1/me', () => HttpResponse.json(mockUser)),

  http.get('*/api/v1/tenants', () => HttpResponse.json({ tenants })),
]
