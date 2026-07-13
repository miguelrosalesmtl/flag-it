/**
 * Shared TanStack Query keys.
 *
 * They live in `lib` because more than one feature's hooks need to reference the
 * same cache entry — e.g. both login and setup seed `me`, and setup flips
 * `setupStatus`. The boundary matrix forbids one feature's hooks from importing
 * another's, so the keys can't live inside a feature; here, any hook may import
 * them.
 */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  setupStatus: ['setup', 'status'] as const,
  tenants: ['tenants', 'list'] as const,
  projects: (tenantSlug: string) => ['projects', tenantSlug] as const,
  project: (tenantSlug: string, projectKey: string) =>
    ['projects', tenantSlug, projectKey] as const,
  flags: (tenantSlug: string, projectKey: string) => ['flags', tenantSlug, projectKey] as const,
  envFlags: (tenantSlug: string, projectKey: string, envKey: string) =>
    ['flags', tenantSlug, projectKey, 'env', envKey] as const,
  flag: (tenantSlug: string, projectKey: string, flagKey: string) =>
    ['flags', tenantSlug, projectKey, flagKey] as const,
  flagConfig: (tenantSlug: string, projectKey: string, flagKey: string, envKey: string) =>
    ['flags', tenantSlug, projectKey, flagKey, 'config', envKey] as const,
  environments: (tenantSlug: string, projectKey: string) =>
    ['environments', tenantSlug, projectKey] as const,
  segments: (tenantSlug: string, projectKey: string) =>
    ['segments', tenantSlug, projectKey] as const,
  segment: (tenantSlug: string, projectKey: string, segKey: string) =>
    ['segments', tenantSlug, projectKey, segKey] as const,
  contexts: (tenantSlug: string, projectKey: string, envKey: string) =>
    ['contexts', tenantSlug, projectKey, envKey] as const,
  context: (tenantSlug: string, projectKey: string, envKey: string, kind: string, key: string) =>
    ['contexts', tenantSlug, projectKey, envKey, kind, key] as const,
  sdkKeys: (tenantSlug: string, projectKey: string, envKey: string) =>
    ['sdk-keys', tenantSlug, projectKey, envKey] as const,
  roles: (tenantSlug: string) => ['roles', tenantSlug] as const,
  permissions: ['permissions'] as const,
  members: (tenantSlug: string) => ['members', tenantSlug] as const,
}
