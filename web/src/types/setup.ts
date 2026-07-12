import type { AuthUser } from '@/types/auth'
import type { Tenant } from '@/types/tenant'

/** GET /setup — is this a fresh install still needing first-run configuration? */
export interface SetupStatus {
  needs_setup: boolean
}

/**
 * POST /setup — the first-run wizard's payload. Creates the first superuser and,
 * optionally, the first tenant. Tenant fields are all-or-nothing.
 */
export interface SetupInput {
  email: string
  password: string
  full_name?: string
  tenant_slug?: string
  tenant_name?: string
}

/** POST /setup result: a session (so the wizard lands the user in the app) plus the created tenant. */
export interface SetupResult {
  token: string
  user: AuthUser
  tenant?: Tenant
}
