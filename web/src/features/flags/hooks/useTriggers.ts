import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { triggersApi } from '@/api/endpoints/triggers'
import { queryKeys } from '@/lib/query-keys'
import type { CreateTriggerInput } from '@/types/trigger'

/** Triggers for one flag + environment. */
export function useTriggers(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  return useQuery({
    queryKey: [...queryKeys.triggers(tenantSlug, projectKey), flagKey, envKey],
    queryFn: () => triggersApi.list(tenantSlug, projectKey, flagKey, envKey),
    enabled: envKey !== '',
  })
}

function useInvalidateTriggers(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.triggers(tenantSlug, projectKey) })
}

export function useCreateTrigger(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const invalidate = useInvalidateTriggers(tenantSlug, projectKey)
  return useMutation({
    mutationFn: (input: CreateTriggerInput) =>
      triggersApi.create(tenantSlug, projectKey, flagKey, envKey, input),
    onSuccess: () => void invalidate(),
  })
}

export function useSetTriggerEnabled(tenantSlug: string, projectKey: string) {
  const invalidate = useInvalidateTriggers(tenantSlug, projectKey)
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      triggersApi.setEnabled(tenantSlug, projectKey, id, enabled),
    onSuccess: () => void invalidate(),
  })
}

export function useResetTrigger(tenantSlug: string, projectKey: string) {
  const invalidate = useInvalidateTriggers(tenantSlug, projectKey)
  return useMutation({
    mutationFn: (id: string) => triggersApi.reset(tenantSlug, projectKey, id),
    onSuccess: () => void invalidate(),
  })
}

export function useDeleteTrigger(tenantSlug: string, projectKey: string) {
  const invalidate = useInvalidateTriggers(tenantSlug, projectKey)
  return useMutation({
    mutationFn: (id: string) => triggersApi.remove(tenantSlug, projectKey, id),
    onSuccess: () => void invalidate(),
  })
}
