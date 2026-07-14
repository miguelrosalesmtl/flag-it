import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { flagsApi } from '@/api/endpoints/flags'
import { queryKeys } from '@/lib/query-keys'
import type { CreateFlagInput, FlagInstruction } from '@/types/flag'

export function useFlags(organizationSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flags(organizationSlug, projectKey),
    queryFn: () => flagsApi.list(organizationSlug, projectKey),
  })
}

/** Flags annotated with a lifecycle status, for the stale-flag view. */
export function useFlagLifecycle(organizationSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flagLifecycle(organizationSlug, projectKey),
    queryFn: () => flagsApi.listLifecycle(organizationSlug, projectKey),
  })
}

/** Flags with their on/off state in one environment (the env-aware flag list). */
export function useEnvFlags(
  organizationSlug: string,
  projectKey: string,
  envKey: string,
  search = '',
) {
  return useQuery({
    // search is appended to the key so filtering refetches; the key still shares
    // a prefix with envFlags(), so toggles/creates invalidate every search view.
    queryKey: [...queryKeys.envFlags(organizationSlug, projectKey, envKey), search],
    queryFn: () => flagsApi.listInEnv(organizationSlug, projectKey, envKey, search),
    enabled: envKey !== '',
  })
}

/** Toggle a flag in the environment shown by the list; refetch that list on success. */
export function useToggleEnvFlag(organizationSlug: string, projectKey: string, envKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ flagKey, on }: { flagKey: string; on: boolean }) =>
      flagsApi.toggle(organizationSlug, projectKey, flagKey, envKey, on),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.envFlags(organizationSlug, projectKey, envKey),
      }),
  })
}

export function useCreateFlag(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateFlagInput) => flagsApi.create(organizationSlug, projectKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.flags(organizationSlug, projectKey) }),
  })
}

export function useFlag(organizationSlug: string, projectKey: string, flagKey: string) {
  return useQuery({
    queryKey: queryKeys.flag(organizationSlug, projectKey, flagKey),
    queryFn: () => flagsApi.get(organizationSlug, projectKey, flagKey),
  })
}

export function useFlagConfig(
  organizationSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  return useQuery({
    queryKey: queryKeys.flagConfig(organizationSlug, projectKey, flagKey, envKey),
    queryFn: () => flagsApi.getConfig(organizationSlug, projectKey, flagKey, envKey),
    // The env is chosen in the container; don't fire until one is selected.
    enabled: envKey !== '',
  })
}

/**
 * Toggle a flag on/off in one environment. On success we write the returned
 * config straight into the cache, so the switch reflects the new state (and its
 * bumped version) without a refetch.
 */
export function useToggleFlag(organizationSlug: string, projectKey: string, flagKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ envKey, on }: { envKey: string; on: boolean }) =>
      flagsApi.toggle(organizationSlug, projectKey, flagKey, envKey, on),
    onSuccess: (config, { envKey }) => {
      queryClient.setQueryData(
        queryKeys.flagConfig(organizationSlug, projectKey, flagKey, envKey),
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
  organizationSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (instructions: FlagInstruction[]) =>
      flagsApi.patchConfig(organizationSlug, projectKey, flagKey, envKey, instructions),
    onSuccess: (config) => {
      queryClient.setQueryData(queryKeys.flagConfig(organizationSlug, projectKey, flagKey, envKey), config)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.envFlags(organizationSlug, projectKey, envKey),
      })
    },
  })
}

export function useDeleteFlag(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (flagKey: string) => flagsApi.remove(organizationSlug, projectKey, flagKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flags', organizationSlug, projectKey] }),
  })
}
