import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { flagsApi } from '@/api/endpoints/flags'
import { queryKeys } from '@/lib/query-keys'
import type { CreateFlagInput, FlagInstruction } from '@/types/flag'

export function useFlags(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flags(tenantSlug, projectKey),
    queryFn: () => flagsApi.list(tenantSlug, projectKey),
  })
}

/** Flags annotated with a lifecycle status, for the stale-flag view. */
export function useFlagLifecycle(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flagLifecycle(tenantSlug, projectKey),
    queryFn: () => flagsApi.listLifecycle(tenantSlug, projectKey),
  })
}

/** Flags with their on/off state in one environment (the env-aware flag list). */
export function useEnvFlags(
  tenantSlug: string,
  projectKey: string,
  envKey: string,
  search = '',
) {
  return useQuery({
    // search is appended to the key so filtering refetches; the key still shares
    // a prefix with envFlags(), so toggles/creates invalidate every search view.
    queryKey: [...queryKeys.envFlags(tenantSlug, projectKey, envKey), search],
    queryFn: () => flagsApi.listInEnv(tenantSlug, projectKey, envKey, search),
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

/**
 * Apply semantic instructions to a flag's config in one environment (off/
 * fallthrough variation, individual targets). Writes the returned config to the
 * cache and refreshes the env-flag list (on/off may have shifted).
 */
export function usePatchFlagConfig(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instructions: FlagInstruction[]) =>
      flagsApi.patchConfig(tenantSlug, projectKey, flagKey, envKey, instructions),
    onSuccess: (config) => {
      queryClient.setQueryData(queryKeys.flagConfig(tenantSlug, projectKey, flagKey, envKey), config)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.envFlags(tenantSlug, projectKey, envKey),
      })
    },
  })
}

export function useDeleteFlag(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (flagKey: string) => flagsApi.remove(tenantSlug, projectKey, flagKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flags', tenantSlug, projectKey] }),
  })
}
