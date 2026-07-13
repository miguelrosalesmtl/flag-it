import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { changesApi } from '@/api/endpoints/changes'
import { queryKeys } from '@/lib/query-keys'
import type { ChangeStatus, CreateChangeInput } from '@/types/change'

/** A project's change requests, optionally filtered by status. */
export function useChanges(tenantSlug: string, projectKey: string, status?: ChangeStatus) {
  return useQuery({
    queryKey: [...queryKeys.changes(tenantSlug, projectKey), status ?? 'all'],
    queryFn: () => changesApi.list(tenantSlug, projectKey, status),
  })
}

/** Propose a change to a flag in one environment (held for review). */
export function useCreateChange(
  tenantSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChangeInput) =>
      changesApi.create(tenantSlug, projectKey, flagKey, envKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.changes(tenantSlug, projectKey) }),
  })
}

/**
 * Approve or reject a change request. Approving applies the flag change on the
 * backend, so we invalidate the change list and every flag-config/env-flag view
 * (the config may have shifted).
 */
export function useReviewChange(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
      comment,
    }: {
      id: string
      action: 'approve' | 'reject'
      comment?: string
    }) =>
      action === 'approve'
        ? changesApi.approve(tenantSlug, projectKey, id, comment)
        : changesApi.reject(tenantSlug, projectKey, id, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.changes(tenantSlug, projectKey) })
      // Approving mutates flag config; refresh flag views broadly.
      void queryClient.invalidateQueries({ queryKey: ['flags', tenantSlug, projectKey] })
    },
  })
}
