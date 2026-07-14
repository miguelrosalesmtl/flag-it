import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { changesApi } from '@/api/endpoints/changes'
import { queryKeys } from '@/lib/query-keys'
import type { ChangeStatus, CreateChangeInput } from '@/types/change'

/** A project's change requests, optionally filtered by status. */
export function useChanges(organizationSlug: string, projectKey: string, status?: ChangeStatus) {
  return useQuery({
    queryKey: [...queryKeys.changes(organizationSlug, projectKey), status ?? 'all'],
    queryFn: () => changesApi.list(organizationSlug, projectKey, status),
  })
}

/** Propose a change to a flag in one environment (held for review). */
export function useCreateChange(
  organizationSlug: string,
  projectKey: string,
  flagKey: string,
  envKey: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChangeInput) =>
      changesApi.create(organizationSlug, projectKey, flagKey, envKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.changes(organizationSlug, projectKey) }),
  })
}

/**
 * Approve or reject a change request. Approving applies the flag change on the
 * backend, so we invalidate the change list and every flag-config/env-flag view
 * (the config may have shifted).
 */
export function useReviewChange(organizationSlug: string, projectKey: string) {
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
        ? changesApi.approve(organizationSlug, projectKey, id, comment)
        : changesApi.reject(organizationSlug, projectKey, id, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.changes(organizationSlug, projectKey) })
      // Approving mutates flag config; refresh flag views broadly.
      void queryClient.invalidateQueries({ queryKey: ['flags', organizationSlug, projectKey] })
    },
  })
}
