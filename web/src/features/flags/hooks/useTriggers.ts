import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { triggersApi } from '@/api/endpoints/triggers'
import { queryKeys } from '@/lib/query-keys'
import type { CreateTriggerInput } from '@/types/trigger'

/** Triggers for one flag + environment. */
export function useTriggers(
  organizationSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  return useQuery({
    queryKey: [...queryKeys.triggers(organizationSlug, projectKey), flagKey, envKey],
    queryFn: () => triggersApi.list(organizationSlug, projectKey, flagKey, envKey),
    enabled: envKey !== '',
  })
}

function useInvalidateTriggers(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.triggers(organizationSlug, projectKey) })
}

export function useCreateTrigger(
  organizationSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const invalidate = useInvalidateTriggers(organizationSlug, projectKey)
  return useMutation({
    mutationFn: (input: CreateTriggerInput) =>
      triggersApi.create(organizationSlug, projectKey, flagKey, envKey, input),
    onSuccess: () => void invalidate(),
  })
}

export function useSetTriggerEnabled(organizationSlug: string, projectKey: string) {
  const invalidate = useInvalidateTriggers(organizationSlug, projectKey)
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      triggersApi.setEnabled(organizationSlug, projectKey, id, enabled),
    onSuccess: () => void invalidate(),
  })
}

export function useResetTrigger(organizationSlug: string, projectKey: string) {
  const invalidate = useInvalidateTriggers(organizationSlug, projectKey)
  return useMutation({
    mutationFn: (id: string) => triggersApi.reset(organizationSlug, projectKey, id),
    onSuccess: () => void invalidate(),
  })
}

export function useDeleteTrigger(organizationSlug: string, projectKey: string) {
  const invalidate = useInvalidateTriggers(organizationSlug, projectKey)
  return useMutation({
    mutationFn: (id: string) => triggersApi.remove(organizationSlug, projectKey, id),
    onSuccess: () => void invalidate(),
  })
}
