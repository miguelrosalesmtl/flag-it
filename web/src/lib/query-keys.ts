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
  organizations: ['organizations', 'list'] as const,
  projects: (organizationSlug: string) => ['projects', organizationSlug] as const,
  project: (organizationSlug: string, projectKey: string) =>
    ['projects', organizationSlug, projectKey] as const,
  flags: (organizationSlug: string, projectKey: string) => ['flags', organizationSlug, projectKey] as const,
  flagLifecycle: (organizationSlug: string, projectKey: string) =>
    ['flags', organizationSlug, projectKey, 'lifecycle'] as const,
  envFlags: (organizationSlug: string, projectKey: string, envKey: string) =>
    ['flags', organizationSlug, projectKey, 'env', envKey] as const,
  flag: (organizationSlug: string, projectKey: string, flagKey: string) =>
    ['flags', organizationSlug, projectKey, flagKey] as const,
  flagConfig: (organizationSlug: string, projectKey: string, flagKey: string, envKey: string) =>
    ['flags', organizationSlug, projectKey, flagKey, 'config', envKey] as const,
  environments: (organizationSlug: string, projectKey: string) =>
    ['environments', organizationSlug, projectKey] as const,
  segments: (organizationSlug: string, projectKey: string) =>
    ['segments', organizationSlug, projectKey] as const,
  segment: (organizationSlug: string, projectKey: string, segKey: string) =>
    ['segments', organizationSlug, projectKey, segKey] as const,
  contexts: (organizationSlug: string, projectKey: string, envKey: string) =>
    ['contexts', organizationSlug, projectKey, envKey] as const,
  context: (organizationSlug: string, projectKey: string, envKey: string, kind: string, key: string) =>
    ['contexts', organizationSlug, projectKey, envKey, kind, key] as const,
  sdkKeys: (organizationSlug: string, projectKey: string, envKey: string) =>
    ['sdk-keys', organizationSlug, projectKey, envKey] as const,
  changes: (organizationSlug: string, projectKey: string) =>
    ['changes', organizationSlug, projectKey] as const,
  scheduledChanges: (organizationSlug: string, projectKey: string) =>
    ['scheduled-changes', organizationSlug, projectKey] as const,
  triggers: (organizationSlug: string, projectKey: string) =>
    ['triggers', organizationSlug, projectKey] as const,
  audit: (organizationSlug: string) => ['audit', organizationSlug] as const,
  webhooks: (organizationSlug: string) => ['webhooks', organizationSlug] as const,
  webhookDeliveries: (organizationSlug: string, id: string) =>
    ['webhooks', organizationSlug, id, 'deliveries'] as const,
  roles: (organizationSlug: string) => ['roles', organizationSlug] as const,
  permissions: ['permissions'] as const,
  members: (organizationSlug: string) => ['members', organizationSlug] as const,
}
