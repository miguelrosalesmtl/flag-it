import { HttpResponse, http } from 'msw'

import type { AuthUser } from '@/types/auth'
import type { ChangeRequest, ChangeStatus } from '@/types/change'
import type { ScheduledChange, ScheduledStatus } from '@/types/scheduled-change'
import type { FlagTrigger, TriggerAction } from '@/types/trigger'
import type { Webhook } from '@/types/webhook'
import type { SeenContext } from '@/types/context'
import type { Member } from '@/types/member'
import type { Role } from '@/types/role'
import type { Environment } from '@/types/environment'
import type { Flag, FlagConfig, FlagRule } from '@/types/flag'
import type { Project } from '@/types/project'
import type { SdkKey } from '@/types/sdk-key'
import type { Segment } from '@/types/segment'
import type { SetupInput } from '@/types/setup'
import type { Tenant } from '@/types/tenant'
import type { User } from '@/types/user'

const seedUsers: User[] = [
  { id: '1', email: 'admin@flag-it.dev', full_name: 'Admin', is_superuser: true, is_active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: '2', email: 'alan@example.com', full_name: 'Alan Turing', is_superuser: false, is_active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
]

let mockUsers: User[] = [...seedUsers]

export function resetUsers() {
  mockUsers = [...seedUsers]
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
    temporary: true,
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
    temporary: false,
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

const allPermissions = [
  'tenant.read',
  'tenant.update',
  'member.manage',
  'role.manage',
  'audit.read',
  'project.create',
  'project.read',
  'project.update',
  'project.delete',
  'environment.manage',
  'sdk_key.manage',
  'flag.read',
  'flag.write',
  'flag.delete',
]

let mockRoles: Role[] = [
  { id: 'r1', tenant_id: 't1', key: 'tenant_admin', name: 'Tenant Admin', description: 'Full control of the tenant.', scope: 'tenant', is_system: true, permissions: ['*'], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
  { id: 'r2', tenant_id: 't1', key: 'writer', name: 'Writer', description: '', scope: 'project', is_system: true, permissions: ['project.read', 'flag.read', 'flag.write', 'flag.delete'], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
  { id: 'r3', tenant_id: 't1', key: 'reader', name: 'Reader', description: '', scope: 'project', is_system: true, permissions: ['project.read', 'flag.read'], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
]

const seedRoles: Role[] = [...mockRoles]

let mockMembers: Member[] = [
  { user_id: 'u1', email: 'admin@flag-it.dev', full_name: 'Admin', role: 'tenant_admin' },
]

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

// Change requests (approval workflow), applied to flagConfigs on approval.
let changeRequests: ChangeRequest[] = []

// Scheduled changes, applied to flagConfigs once their time passes.
let scheduledChanges: ScheduledChange[] = []

// Flag triggers (inbound webhooks).
let flagTriggers: FlagTrigger[] = []
const triggerURL = (token: string) => `http://localhost:8080/api/v1/triggers/${token}`
// Strips the secret token/url — mirrors the server, which reveals them once.
const withoutSecret = (t: FlagTrigger): FlagTrigger => ({ ...t, token: undefined, url: undefined })

// Outbound webhooks.
let mockWebhooks: Webhook[] = []
const webhookSecret = () => `whsec_${crypto.randomUUID().replace(/-/g, '')}`
const webhookNoSecret = (w: Webhook): Webhook => ({ ...w, secret: undefined })

// Lazily apply any pending scheduled changes whose time has come (the mock's
// stand-in for the backend scheduler). Called before every scheduled read.
function runDueScheduledChanges() {
  const now = Date.now()
  for (const sc of scheduledChanges) {
    if (sc.status === 'pending' && new Date(sc.scheduled_for).getTime() <= now) {
      const config = (flagConfigs[configKey(sc.flag_key, sc.environment_key)] ??= newConfig())
      applyInstructions(config, sc.instructions)
      sc.status = 'applied'
      sc.applied_at = new Date().toISOString()
    }
  }
}

type Instruction = {
  kind: string
  variation?: number
  contextKind?: string
  values?: string[]
  clauses?: FlagRule['clauses']
  rollout?: FlagRule['rollout']
  ruleId?: string
  ruleIds?: string[]
}

// Applies semantic instructions to a config in place; bumps the version once.
function applyInstructions(current: FlagConfig, instructions: Instruction[]) {
  for (const ins of instructions) {
    if (ins.kind === 'turnFlagOn') current.on = true
    else if (ins.kind === 'turnFlagOff') current.on = false
    else if (ins.kind === 'addRule' && ins.clauses)
      current.rules.push({
        id: crypto.randomUUID(),
        clauses: ins.clauses,
        variation: ins.variation,
        rollout: ins.rollout,
      })
    else if (ins.kind === 'updateRule' && ins.ruleId && ins.clauses)
      current.rules = current.rules.map((r) =>
        r.id === ins.ruleId
          ? { ...r, clauses: ins.clauses!, variation: ins.variation, rollout: ins.rollout }
          : r,
      )
    else if (ins.kind === 'removeRule' && ins.ruleId)
      current.rules = current.rules.filter((r) => r.id !== ins.ruleId)
    else if (ins.kind === 'reorderRules' && ins.ruleIds) {
      const order = ins.ruleIds
      current.rules = [...current.rules].sort((a, b) => order.indexOf(a.id!) - order.indexOf(b.id!))
    }
    else if (ins.kind === 'updateOffVariation' && ins.variation !== undefined)
      current.off_variation = ins.variation
    else if (ins.kind === 'updateFallthroughVariation' && ins.variation !== undefined)
      current.fallthrough = { variation: ins.variation }
    else if (ins.kind === 'addTargets' && ins.variation !== undefined && ins.values) {
      const kind = ins.contextKind ?? 'user'
      let t = current.targets.find((x) => x.variation === ins.variation && x.contextKind === kind)
      if (!t) {
        t = { contextKind: kind, variation: ins.variation, values: [] }
        current.targets.push(t)
      }
      for (const v of ins.values) if (!t.values.includes(v)) t.values.push(v)
    } else if (ins.kind === 'removeTargets' && ins.variation !== undefined && ins.values) {
      const kind = ins.contextKind ?? 'user'
      const t = current.targets.find((x) => x.variation === ins.variation && x.contextKind === kind)
      if (t) t.values = t.values.filter((v) => !ins.values!.includes(v))
      current.targets = current.targets.filter((x) => x.values.length > 0)
    }
  }
  current.version += 1
}

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
  mockMembers = [{ user_id: 'u1', email: 'admin@flag-it.dev', full_name: 'Admin', role: 'tenant_admin' }]
  mockRoles = [...seedRoles]
  flagConfigs = {}
  changeRequests = []
  scheduledChanges = []
  flagTriggers = []
  mockWebhooks = []
}

export const handlers = [
  // Platform users (superuser).
  http.get('*/api/v1/users', () => HttpResponse.json({ users: mockUsers })),

  http.post('*/api/v1/users', async ({ request }) => {
    const input = (await request.json()) as {
      email: string
      full_name?: string
      is_superuser?: boolean
    }
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      full_name: input.full_name ?? '',
      is_superuser: input.is_superuser ?? false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockUsers = [...mockUsers, user]
    return HttpResponse.json(user)
  }),

  http.patch('*/api/v1/users/:userID', async ({ params, request }) => {
    const u = mockUsers.find((x) => x.id === String(params.userID))
    if (!u) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    const body = (await request.json()) as { full_name: string; is_active: boolean }
    u.full_name = body.full_name
    u.is_active = body.is_active
    return HttpResponse.json(u)
  }),

  http.delete('*/api/v1/users/:userID', ({ params }) => {
    mockUsers = mockUsers.filter((u) => u.id !== String(params.userID))
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

  http.delete('*/api/v1/tenants/:tenantSlug', ({ params }) => {
    tenants = tenants.filter((t) => t.slug !== String(params.tenantSlug))
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete('*/api/v1/tenants/:tenantSlug/projects/:projectKey', ({ params }) => {
    mockProjects = mockProjects.filter((p) => p.key !== String(params.projectKey))
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey',
    ({ params }) => {
      mockFlags = mockFlags.filter((f) => f.key !== String(params.flagKey))
      return new HttpResponse(null, { status: 204 })
    },
  ),

  http.delete(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/segments/:segKey',
    ({ params }) => {
      mockSegments = mockSegments.filter((s) => s.key !== String(params.segKey))
      return new HttpResponse(null, { status: 204 })
    },
  ),

  http.get('*/api/v1/permissions', () => HttpResponse.json({ permissions: allPermissions })),

  http.get('*/api/v1/tenants/:tenantSlug/roles', () => HttpResponse.json({ roles: mockRoles })),

  http.post('*/api/v1/tenants/:tenantSlug/roles', async ({ request }) => {
    const input = (await request.json()) as {
      key: string
      name: string
      description?: string
      scope: 'tenant' | 'project'
      permissions: string[]
    }
    const role: Role = {
      id: crypto.randomUUID(),
      tenant_id: 't1',
      key: input.key,
      name: input.name,
      description: input.description ?? '',
      scope: input.scope,
      is_system: false,
      permissions: input.permissions,
      created_at: '2026-07-12T00:00:00Z',
      updated_at: '2026-07-12T00:00:00Z',
    }
    mockRoles.push(role)
    return HttpResponse.json(role, { status: 201 })
  }),

  http.get('*/api/v1/tenants/:tenantSlug/members', () =>
    HttpResponse.json({ members: mockMembers }),
  ),

  http.post('*/api/v1/tenants/:tenantSlug/members', async ({ request }) => {
    const input = (await request.json()) as { email: string; role?: string }
    const member: Member = {
      user_id: crypto.randomUUID(),
      email: input.email,
      full_name: '',
      role: input.role ?? '',
    }
    mockMembers.push(member)
    return HttpResponse.json({ membership: { id: member.user_id } }, { status: 201 })
  }),

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

  // Flags annotated with a lifecycle status (stale detection). The mock derives
  // status from the flag's key so the screen has something to show.
  http.get('*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/lifecycle', () => {
    const flags = mockFlags.map((f) => {
      const status = f.key === 'pricing-tier' ? 'inactive' : 'active'
      return {
        ...f,
        status,
        last_evaluated: status === 'inactive' ? '2026-05-01T00:00:00Z' : '2026-07-12T00:00:00Z',
      }
    })
    return HttpResponse.json({ flags })
  }),

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
        temporary?: boolean
        variations: unknown[]
      }
      const flag: Flag = {
        id: crypto.randomUUID(),
        project_id: 'p1',
        key: String(params.flagKey),
        name: body.name,
        description: body.description ?? '',
        client_side_available: body.client_side_available ?? false,
        temporary: body.temporary ?? false,
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
      const body = (await request.json()) as { instructions: Instruction[] }
      applyInstructions(current, body.instructions)
      return HttpResponse.json(current)
    },
  ),

  // --- Approvals (change requests) ---
  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/changes',
    ({ request }) => {
      const status = new URL(request.url).searchParams.get('status') as ChangeStatus | null
      const changes = changeRequests.filter((c) => !status || c.status === status)
      return HttpResponse.json({ changes })
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey/environments/:envKey/changes',
    async ({ params, request }) => {
      const body = (await request.json()) as { comment?: string; instructions: Instruction[] }
      if (!body.instructions?.length) {
        return HttpResponse.json({ detail: 'at least one instruction is required' }, { status: 400 })
      }
      const cr: ChangeRequest = {
        id: crypto.randomUUID(),
        project_id: String(params.projectKey),
        environment_id: String(params.envKey),
        environment_key: String(params.envKey),
        flag_key: String(params.flagKey),
        instructions: body.instructions,
        comment: body.comment ?? '',
        status: 'pending',
        requested_by: mockUser.id,
        requested_by_email: mockUser.email,
        created_at: new Date().toISOString(),
      }
      changeRequests = [cr, ...changeRequests]
      return HttpResponse.json(cr)
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/changes/:changeId/approve',
    async ({ params, request }) => {
      const cr = changeRequests.find((c) => c.id === String(params.changeId))
      if (!cr) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
      if (cr.status !== 'pending')
        return HttpResponse.json({ detail: 'not pending' }, { status: 409 })
      const body = (await request.json().catch(() => ({}))) as { comment?: string }
      const config = (flagConfigs[configKey(cr.flag_key, cr.environment_key)] ??= newConfig())
      applyInstructions(config, cr.instructions)
      cr.status = 'approved'
      cr.reviewed_by = mockUser.id
      cr.reviewed_by_email = mockUser.email
      cr.review_comment = body.comment ?? ''
      cr.reviewed_at = new Date().toISOString()
      return HttpResponse.json(cr)
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/changes/:changeId/reject',
    async ({ params, request }) => {
      const cr = changeRequests.find((c) => c.id === String(params.changeId))
      if (!cr) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
      if (cr.status !== 'pending')
        return HttpResponse.json({ detail: 'not pending' }, { status: 409 })
      const body = (await request.json().catch(() => ({}))) as { comment?: string }
      cr.status = 'rejected'
      cr.reviewed_by = mockUser.id
      cr.reviewed_by_email = mockUser.email
      cr.review_comment = body.comment ?? ''
      cr.reviewed_at = new Date().toISOString()
      return HttpResponse.json(cr)
    },
  ),

  // --- Scheduled changes ---
  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/scheduled-changes',
    ({ request }) => {
      runDueScheduledChanges()
      const url = new URL(request.url)
      const status = url.searchParams.get('status') as ScheduledStatus | null
      const flag = url.searchParams.get('flag')
      const env = url.searchParams.get('env')
      const list = scheduledChanges.filter(
        (c) =>
          (!status || c.status === status) &&
          (!flag || c.flag_key === flag) &&
          (!env || c.environment_key === env),
      )
      return HttpResponse.json({ scheduled_changes: list })
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey/environments/:envKey/scheduled-changes',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        comment?: string
        scheduled_for: string
        instructions: Instruction[]
      }
      if (!body.instructions?.length) {
        return HttpResponse.json({ detail: 'at least one instruction is required' }, { status: 400 })
      }
      if (!body.scheduled_for || new Date(body.scheduled_for).getTime() <= Date.now()) {
        return HttpResponse.json({ detail: 'scheduled_for must be in the future' }, { status: 400 })
      }
      const sc: ScheduledChange = {
        id: crypto.randomUUID(),
        project_id: String(params.projectKey),
        environment_id: String(params.envKey),
        environment_key: String(params.envKey),
        flag_key: String(params.flagKey),
        instructions: body.instructions,
        comment: body.comment ?? '',
        scheduled_for: body.scheduled_for,
        status: 'pending',
        created_by: mockUser.id,
        created_by_email: mockUser.email,
        created_at: new Date().toISOString(),
      }
      scheduledChanges = [sc, ...scheduledChanges]
      return HttpResponse.json(sc)
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/scheduled-changes/:scheduledId/cancel',
    ({ params }) => {
      const sc = scheduledChanges.find((c) => c.id === String(params.scheduledId))
      if (!sc || sc.status !== 'pending')
        return HttpResponse.json({ detail: 'not found' }, { status: 404 })
      sc.status = 'cancelled'
      return HttpResponse.json(sc)
    },
  ),

  // --- Flag triggers ---
  http.get(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/triggers',
    ({ request }) => {
      const url = new URL(request.url)
      const flag = url.searchParams.get('flag')
      const env = url.searchParams.get('env')
      const triggers = flagTriggers
        .filter((t) => (!flag || t.flag_key === flag) && (!env || t.environment_key === env))
        .map(withoutSecret) // never re-expose the token/url in a list
      return HttpResponse.json({ triggers })
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/flags/:flagKey/environments/:envKey/triggers',
    async ({ params, request }) => {
      const body = (await request.json()) as { action: TriggerAction; description?: string }
      const token = `trg_${crypto.randomUUID().replace(/-/g, '')}`
      const t: FlagTrigger = {
        id: crypto.randomUUID(),
        project_id: String(params.projectKey),
        environment_id: String(params.envKey),
        environment_key: String(params.envKey),
        flag_key: String(params.flagKey),
        action: body.action,
        description: body.description ?? '',
        enabled: true,
        exec_count: 0,
        created_by: mockUser.id,
        created_by_email: mockUser.email,
        created_at: new Date().toISOString(),
        last_executed_at: null,
        token,
        url: triggerURL(token),
      }
      flagTriggers = [t, ...flagTriggers]
      return HttpResponse.json(t)
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/triggers/:triggerId/enabled',
    async ({ params, request }) => {
      const t = flagTriggers.find((x) => x.id === String(params.triggerId))
      if (!t) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
      const body = (await request.json()) as { enabled: boolean }
      t.enabled = body.enabled
      return HttpResponse.json(withoutSecret(t))
    },
  ),

  http.post(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/triggers/:triggerId/reset',
    ({ params }) => {
      const t = flagTriggers.find((x) => x.id === String(params.triggerId))
      if (!t) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
      t.token = `trg_${crypto.randomUUID().replace(/-/g, '')}`
      t.url = triggerURL(t.token)
      return HttpResponse.json(t)
    },
  ),

  http.delete(
    '*/api/v1/tenants/:tenantSlug/projects/:projectKey/triggers/:triggerId',
    ({ params }) => {
      flagTriggers = flagTriggers.filter((x) => x.id !== String(params.triggerId))
      return new HttpResponse(null, { status: 204 })
    },
  ),

  // --- Audit log ---
  http.get('*/api/v1/tenants/:tenantSlug/audit', ({ request }) => {
    const rt = new URL(request.url).searchParams.get('resource_type')
    const entries = [
      { id: 'au1', actor_email: 'admin@flag-it.dev', action: 'flag.config.patched', resource_type: 'flag', resource_key: 'new-checkout', comment: 'Launch for GA', created_at: '2026-07-13T12:00:00Z' },
      { id: 'au2', actor_email: 'admin@flag-it.dev', action: 'sdk_key.created', resource_type: 'sdk_key', resource_key: 'k-123', created_at: '2026-07-13T11:30:00Z' },
      { id: 'au3', actor_email: 'admin@flag-it.dev', action: 'segment.saved', resource_type: 'segment', resource_key: 'beta-users', created_at: '2026-07-13T10:00:00Z' },
    ].filter((e) => !rt || e.resource_type === rt)
    return HttpResponse.json({ entries })
  }),

  // --- Outbound webhooks ---
  http.get('*/api/v1/tenants/:tenantSlug/webhooks', () =>
    HttpResponse.json({ webhooks: mockWebhooks.map(webhookNoSecret) }),
  ),

  http.post('*/api/v1/tenants/:tenantSlug/webhooks', async ({ request }) => {
    const body = (await request.json()) as {
      url: string
      event_types: string[]
      description?: string
    }
    if (!body.event_types?.length) {
      return HttpResponse.json({ detail: 'at least one event type is required' }, { status: 400 })
    }
    const w: Webhook = {
      id: crypto.randomUUID(),
      tenant_id: 't1',
      url: body.url,
      secret: webhookSecret(),
      event_types: body.event_types,
      description: body.description ?? '',
      enabled: true,
      created_by: mockUser.id,
      created_by_email: mockUser.email,
      created_at: new Date().toISOString(),
    }
    mockWebhooks = [w, ...mockWebhooks]
    return HttpResponse.json(w)
  }),

  http.post(
    '*/api/v1/tenants/:tenantSlug/webhooks/:webhookId/enabled',
    async ({ params, request }) => {
      const w = mockWebhooks.find((x) => x.id === String(params.webhookId))
      if (!w) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
      const body = (await request.json()) as { enabled: boolean }
      w.enabled = body.enabled
      return HttpResponse.json(webhookNoSecret(w))
    },
  ),

  http.post('*/api/v1/tenants/:tenantSlug/webhooks/:webhookId/reset', ({ params }) => {
    const w = mockWebhooks.find((x) => x.id === String(params.webhookId))
    if (!w) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    w.secret = webhookSecret()
    return HttpResponse.json(w)
  }),

  http.post('*/api/v1/tenants/:tenantSlug/webhooks/:webhookId/test', ({ params }) => {
    const w = mockWebhooks.find((x) => x.id === String(params.webhookId))
    if (!w) return HttpResponse.json({ detail: 'not found' }, { status: 404 })
    return HttpResponse.json({
      id: crypto.randomUUID(),
      webhook_id: w.id,
      event_type: 'webhook.test',
      status: 'pending',
      attempts: 0,
      response_status: 0,
      next_attempt_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      delivered_at: null,
    })
  }),

  http.get('*/api/v1/tenants/:tenantSlug/webhooks/:webhookId/deliveries', ({ params }) => {
    const id = String(params.webhookId)
    return HttpResponse.json({
      deliveries: [
        { id: 'd1', webhook_id: id, event_type: 'flag.config.patched', status: 'success', attempts: 1, response_status: 200, next_attempt_at: '2026-07-13T12:00:00Z', created_at: '2026-07-13T12:00:00Z', delivered_at: '2026-07-13T12:00:01Z' },
        { id: 'd2', webhook_id: id, event_type: 'change.approved', status: 'failed', attempts: 5, response_status: 500, error: 'status 500', next_attempt_at: '2026-07-13T11:00:00Z', created_at: '2026-07-13T11:00:00Z', delivered_at: '2026-07-13T11:05:00Z' },
      ],
    })
  }),

  http.delete('*/api/v1/tenants/:tenantSlug/webhooks/:webhookId', ({ params }) => {
    mockWebhooks = mockWebhooks.filter((x) => x.id !== String(params.webhookId))
    return new HttpResponse(null, { status: 204 })
  }),
]
