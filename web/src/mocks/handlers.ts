import { HttpResponse, http } from 'msw'

import type { AuthUser } from '@/types/auth'
import type { SeenContext } from '@/types/context'
import type { Environment } from '@/types/environment'
import type { Flag, FlagConfig } from '@/types/flag'
import type { Project } from '@/types/project'
import type { SdkKey } from '@/types/sdk-key'
import type { Segment } from '@/types/segment'
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

let mockProjects: Project[] = [
  {
    id: 'p1',
    tenant_id: 't1',
    key: 'checkout',
    name: 'Checkout',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'p2',
    tenant_id: 't1',
    key: 'mobile-app',
    name: 'Mobile App',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const seedProjects: Project[] = [...mockProjects]

let mockFlags: Flag[] = [
  {
    id: 'f1',
    project_id: 'p1',
    key: 'new-checkout',
    name: 'New checkout',
    description: 'Rolls out the redesigned checkout flow.',
    client_side_available: true,
    variations: [true, false],
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'f2',
    project_id: 'p1',
    key: 'pricing-tier',
    name: 'Pricing tier',
    description: '',
    client_side_available: false,
    variations: ['free', 'pro', 'enterprise'],
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const seedFlags: Flag[] = [...mockFlags]

let mockEnvironments: Environment[] = [
  {
    id: 'env-prod',
    project_id: 'p1',
    key: 'production',
    name: 'Production',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'env-staging',
    project_id: 'p1',
    key: 'staging',
    name: 'Staging',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const seedEnvironments: Environment[] = [...mockEnvironments]

let mockSegments: Segment[] = [
  {
    id: 's1',
    project_id: 'p1',
    key: 'beta-users',
    name: 'Beta users',
    description: 'Early-access cohort.',
    included: ['user-1', 'user-2'],
    excluded: [],
    included_contexts: [],
    excluded_contexts: [],
    rules: [],
    version: 1,
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const seedSegments: Segment[] = [...mockSegments]

let mockSdkKeys: SdkKey[] = [
  {
    id: 'k1',
    environment_id: 'env-prod',
    key: 'sdk-mock0000000000000000000000000000',
    kind: 'server',
    name: 'CI',
    created_at: '2026-07-12T00:00:00Z',
  },
]

const seedSdkKeys: SdkKey[] = [...mockSdkKeys]

const mockContexts: SeenContext[] = [
  {
    id: 'c1',
    environment_id: 'env-prod',
    kind: 'user',
    key: 'alice',
    attributes: { plan: 'pro', country: 'US' },
    first_seen: '2026-07-12T00:00:00Z',
    last_seen: '2026-07-12T09:20:00Z',
  },
  {
    id: 'c2',
    environment_id: 'env-prod',
    kind: 'account',
    key: 'acme-corp',
    attributes: { tier: 'enterprise' },
    first_seen: '2026-07-12T00:00:00Z',
    last_seen: '2026-07-12T09:10:00Z',
  },
]

function newConfig(): FlagConfig {
  return { on: false, off_variation: 1, fallthrough: { variation: 0 }, targets: [], rules: [], version: 1 }
}

// Per (flagKey, envKey) config state, so the toggle actually flips something.
let flagConfigs: Record<string, FlagConfig> = {}
const configKey = (flagKey: string, envKey: string) => `${flagKey}:${envKey}`

// Lower-cased ?search= value, for the mock server-side filters.
const searchParam = (request: Request) =>
  (new URL(request.url).searchParams.get('search') ?? '').toLowerCase()

const includesAny = (q: string, ...fields: string[]) =>
  !q || fields.some((f) => f.toLowerCase().includes(q))

// Default to a configured install (shows login). Flip `needsSetup` in a scenario
// to exercise the wizard.
let needsSetup = false
let tenants: Tenant[] = [...seedTenants]

export function resetBackend() {
  needsSetup = false
  tenants = [...seedTenants]
  mockProjects = [...seedProjects]
  mockFlags = [...seedFlags]
  mockEnvironments = [...seedEnvironments]
  mockSegments = [...seedSegments]
  mockSdkKeys = [...seedSdkKeys]
  flagConfigs = {}
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

  http.get('*/api/v1/tenants/:tenantSlug/projects', () =>
    HttpResponse.json({ projects: mockProjects }),
  ),

  http.post('*/api/v1/tenants/:tenantSlug/projects', async ({ request }) => {
    const input = (await request.json()) as { key: string; name: string }
    const project: Project = {
      id: crypto.randomUUID(),
      tenant_id: 't1',
      key: input.key,
      name: input.name,
      created_at: '2026-07-12T00:00:00Z',
      updated_at: '2026-07-12T00:00:00Z',
    }
    mockProjects.push(project)
    return HttpResponse.json({ project, environments: mockEnvironments }, { status: 201 })
  }),

  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey', ({ params }) => {
    const project = mockProjects.find((p) => p.key === params.projectKey)
    if (!project) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(project)
  }),

  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags', () =>
    HttpResponse.json({ flags: mockFlags }),
  ),

  // Flags with per-environment on/off state (the env-aware flag list).
  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments/:envKey/flags',
    ({ params, request }) => {
      const envKey = String(params.envKey)
      const q = searchParam(request)
      const flags = mockFlags
        .filter((f) => includesAny(q, f.key, f.name, f.description))
        .map((f) => ({ ...f, on: flagConfigs[configKey(f.key, envKey)]?.on ?? false }))
      return HttpResponse.json({ flags })
    },
  ),

  http.put(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        name: string
        description?: string
        client_side_available?: boolean
        variations: unknown[]
      }
      const flag: Flag = {
        id: crypto.randomUUID(),
        project_id: 'p1',
        key: String(params.flagKey),
        name: body.name,
        description: body.description ?? '',
        client_side_available: body.client_side_available ?? false,
        variations: body.variations,
        created_at: '2026-07-12T00:00:00Z',
        updated_at: '2026-07-12T00:00:00Z',
      }
      const existing = mockFlags.findIndex((f) => f.key === flag.key)
      if (existing >= 0) mockFlags[existing] = flag
      else mockFlags.push(flag)
      return HttpResponse.json(flag)
    },
  ),

  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments', ({ request }) => {
    const q = searchParam(request)
    return HttpResponse.json({
      environments: mockEnvironments.filter((e) => includesAny(q, e.key, e.name)),
    })
  }),

  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments/:envKey/sdk-keys',
    () => HttpResponse.json({ sdk_keys: mockSdkKeys }),
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments/:envKey/sdk-keys',
    async ({ request }) => {
      const body = (await request.json()) as { kind: 'server' | 'client'; name?: string }
      const key: SdkKey = {
        id: crypto.randomUUID(),
        environment_id: 'env-prod',
        key: `${body.kind === 'client' ? 'client-' : 'sdk-'}${crypto.randomUUID().replace(/-/g, '')}`,
        kind: body.kind,
        name: body.name ?? '',
        created_at: '2026-07-12T00:00:00Z',
      }
      mockSdkKeys.push(key)
      return HttpResponse.json(key, { status: 201 })
    },
  ),

  http.delete(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments/:envKey/sdk-keys/:keyID',
    ({ params }) => {
      mockSdkKeys = mockSdkKeys.filter((k) => k.id !== params.keyID)
      return new HttpResponse(null, { status: 204 })
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments',
    async ({ request }) => {
      const input = (await request.json()) as { key: string; name: string }
      const env: Environment = {
        id: crypto.randomUUID(),
        project_id: 'p1',
        key: input.key,
        name: input.name,
        created_at: '2026-07-12T00:00:00Z',
        updated_at: '2026-07-12T00:00:00Z',
      }
      mockEnvironments.push(env)
      return HttpResponse.json(env, { status: 201 })
    },
  ),

  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments/:envKey/contexts',
    ({ request }) => {
      const q = searchParam(request)
      return HttpResponse.json({
        contexts: mockContexts.filter((c) => includesAny(q, c.kind, c.key)),
      })
    },
  ),

  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/environments/:envKey/contexts/:kind/:key',
    ({ params }) => {
      const context = mockContexts.find(
        (c) => c.kind === params.kind && c.key === decodeURIComponent(String(params.key)),
      )
      if (!context) return new HttpResponse(null, { status: 404 })
      const evaluations = mockFlags.map((f) => ({
        flag_key: f.key,
        variation: 0,
        value: f.variations[0],
        reason: 'FALLTHROUGH',
      }))
      return HttpResponse.json({ context, evaluations })
    },
  ),

  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey/segments', ({ request }) => {
    const q = searchParam(request)
    return HttpResponse.json({
      segments: mockSegments.filter((s) => includesAny(q, s.key, s.name, s.description)),
    })
  }),

  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey/segments/:segKey', ({ params }) => {
    const segment = mockSegments.find((s) => s.key === params.segKey)
    if (!segment) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(segment)
  }),

  http.put(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/segments/:segKey',
    async ({ params, request }) => {
      const key = String(params.segKey)
      const body = (await request.json()) as Partial<Segment>
      const existing = mockSegments.find((s) => s.key === key)
      const segment: Segment = {
        id: existing?.id ?? crypto.randomUUID(),
        project_id: 'p1',
        key,
        name: body.name ?? key,
        description: body.description ?? '',
        included: body.included ?? [],
        excluded: body.excluded ?? [],
        included_contexts: body.included_contexts ?? [],
        excluded_contexts: body.excluded_contexts ?? [],
        rules: body.rules ?? [],
        version: (existing?.version ?? 0) + 1,
        created_at: existing?.created_at ?? '2026-07-12T00:00:00Z',
        updated_at: '2026-07-12T00:00:00Z',
      }
      if (existing) mockSegments = mockSegments.map((s) => (s.key === key ? segment : s))
      else mockSegments.push(segment)
      return HttpResponse.json(segment)
    },
  ),

  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey', ({ params }) => {
    const flag = mockFlags.find((f) => f.key === params.flagKey)
    if (!flag) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(flag)
  }),

  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey/environments/:envKey',
    ({ params }) => {
      const k = configKey(String(params.flagKey), String(params.envKey))
      flagConfigs[k] ??= newConfig()
      return HttpResponse.json(flagConfigs[k])
    },
  ),

  http.patch(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey/environments/:envKey',
    async ({ params, request }) => {
      const k = configKey(String(params.flagKey), String(params.envKey))
      const current = (flagConfigs[k] ??= newConfig())
      const body = (await request.json()) as { instructions: { kind: string }[] }
      for (const ins of body.instructions) {
        if (ins.kind === 'turnFlagOn') current.on = true
        if (ins.kind === 'turnFlagOff') current.on = false
      }
      current.version += 1
      return HttpResponse.json(current)
    },
  ),
]
