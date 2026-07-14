import type { AuthUser } from '@/types/auth'
import type { Organization } from '@/types/organization'

/** GET /setup — is this a fresh install still needing first-run configuration? */
export interface SetupStatus {
  needs_setup: boolean
}

/**
 * POST /setup — the first-run wizard's payload. Creates the first superuser and,
 * optionally, the first organization. Organization fields are all-or-nothing.
 */
export interface SetupInput {
  email: string
  password: string
  full_name?: string
  organization_slug?: string
  organization_name?: string
}

/** POST /setup result: a session (so the wizard lands the user in the app) plus the created organization. */
export interface SetupResult {
  token: string
  user: AuthUser
  organization?: Organization
}
