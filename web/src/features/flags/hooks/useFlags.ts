import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { environmentsApi } from '@/api/endpoints/environments'
import { flagsApi } from '@/api/endpoints/flags'
import { queryKeys } from '@/lib/query-keys'

export function useFlags(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flags(tenantSlug, projectKey),
    queryFn: () => flagsApi.list(tenantSlug, projectKey),
  })
}

export function useFlag(tenantSlug: string, projectKey: string, flagKey: string) {
  return useQuery({
    queryKey: queryKeys.flag(tenantSlug, projectKey, flagKey),
    queryFn: () => flagsApi.get(tenantSlug, projectKey, flagKey),
  })
}

export function useEnvironments(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.environments(tenantSlug, projectKey),
    queryFn: () => environmentsApi.list(tenantSlug, projectKey),
  })
}

export function useFlagConfig(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  return useQuery({
    queryKey: queryKeys.flagConfig(tenantSlug, projectKey, flagKey, envKey),
    queryFn: () => flagsApi.getConfig(tenantSlug, projectKey, flagKey, envKey),
    // The env is chosen in the container; don't fire until one is selected.
    enabled: envKey !== '',
  })
}

/**
 * Toggle a flag on/off in one environment. On success we write the returned
 * config straight into the cache, so the switch reflects the new state (and its
 * bumped version) without a refetch.
 */
export function useToggleFlag(tenantSlug: string, projectKey: string, flagKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ envKey, on }: { envKey: string; on: boolean }) =>
      flagsApi.toggle(tenantSlug, projectKey, flagKey, envKey, on),
    onSuccess: (config, { envKey }) => {
      queryClient.setQueryData(
        queryKeys.flagConfig(tenantSlug, projectKey, flagKey, envKey),
        config,
      )
    },
  })
}
