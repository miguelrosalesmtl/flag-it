import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { scheduledChangesApi } from '@/api/endpoints/scheduledChanges'
import { queryKeys } from '@/lib/query-keys'
import type { CreateScheduledChangeInput, ScheduledStatus } from '@/types/scheduled-change'

/** Scheduled changes for one flag + environment (the flag-detail card). */
export function useScheduledChanges(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
  status?: ScheduledStatus,
) {
  return useQuery({
    queryKey: [...queryKeys.scheduledChanges(tenantSlug, projectKey), flagKey, envKey, status ?? 'all'],
    queryFn: () =>
      scheduledChangesApi.list(tenantSlug, projectKey, { flag: flagKey, env: envKey, status }),
    enabled: envKey !== '',
  })
}

/** Schedule a change to a flag in one environment. */
export function useCreateScheduledChange(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateScheduledChangeInput) =>
      scheduledChangesApi.create(tenantSlug, projectKey, flagKey, envKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduledChanges(tenantSlug, projectKey),
      }),
  })
}

/** Cancel a pending scheduled change. */
export function useCancelScheduledChange(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => scheduledChangesApi.cancel(tenantSlug, projectKey, id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.scheduledChanges(tenantSlug, projectKey),
      }),
  })
}
