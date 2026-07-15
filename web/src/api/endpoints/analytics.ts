import { api } from '@/api/client'
import type { EnvStats, FlagStats } from '@/types/analytics'

const base = (organizationSlug: string, projectKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}`

export const analyticsApi = {
  // Per-variation evaluation counts for one flag in an environment.
  flagStats: (
    organizationSlug: string,
    projectKey: string,
    flagKey: string,
    envKey: string,
    since: string,
  ) =>
    api.get<FlagStats>(
      `${base(organizationSlug, projectKey)}/flags/${flagKey}/environments/${envKey}/stats?since=${since}`,
    ),
  // Per-flag evaluation totals for an environment, most-active first.
  envStats: (organizationSlug: string, projectKey: string, envKey: string, since: string) =>
    api.get<EnvStats>(
      `${base(organizationSlug, projectKey)}/environments/${envKey}/stats?since=${since}`,
    ),
}
