import { useQuery } from '@tanstack/react-query'

import { analyticsApi } from '@/api/endpoints/analytics'

/** Per-variation evaluation counts for one flag in an environment. */
export function useFlagStats(
  organizationSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
  since: string,
) {
  return useQuery({
    queryKey: ['stats', 'flag', organizationSlug, projectKey, flagKey, envKey, since],
    queryFn: () => analyticsApi.flagStats(organizationSlug, projectKey, flagKey, envKey, since),
    enabled: envKey !== '',
  })
}

/** Per-flag evaluation totals for an environment. */
export function useEnvStats(
  organizationSlug: string,
  projectKey: string,
  envKey: string,
  since: string,
) {
  return useQuery({
    queryKey: ['stats', 'env', organizationSlug, projectKey, envKey, since],
    queryFn: () => analyticsApi.envStats(organizationSlug, projectKey, envKey, since),
    enabled: envKey !== '',
  })
}
