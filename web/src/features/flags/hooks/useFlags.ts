import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { flagsApi } from '@/api/endpoints/flags'
import { queryKeys } from '@/lib/query-keys'
import type { CreateFlagInput } from '@/types/flag'

export function useFlags(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flags(tenantSlug, projectKey),
    queryFn: () => flagsApi.list(tenantSlug, projectKey),
  })
}

/** Flags with their on/off state in one environment (the env-aware flag list). */
export function useEnvFlags(tenantSlug: string, projectKey: string, envKey: string) {
  return useQuery({
    queryKey: queryKeys.envFlags(tenantSlug, projectKey, envKey),
    queryFn: () => flagsApi.listInEnv(tenantSlug, projectKey, envKey),
    enabled: envKey !== '',
  })
}

/** Toggle a flag in the environment shown by the list; refetch that list on success. */
export function useToggleEnvFlag(tenantSlug: string, projectKey: string, envKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ flagKey, on }: { flagKey: string; on: boolean }) =>
      flagsApi.toggle(tenantSlug, projectKey, flagKey, envKey, on),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.envFlags(tenantSlug, projectKey, envKey),
      }),
  })
}

export function useCreateFlag(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFlagInput) => flagsApi.create(tenantSlug, projectKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.flags(tenantSlug, projectKey) }),
  })
}

export function useFlag(tenantSlug: string, projectKey: string, flagKey: string) {
  return useQuery({
    queryKey: queryKeys.flag(tenantSlug, projectKey, flagKey),
    queryFn: () => flagsApi.get(tenantSlug, projectKey, flagKey),
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
