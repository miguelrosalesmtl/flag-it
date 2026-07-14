import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { membersApi } from '@/api/endpoints/members'
import { queryKeys } from '@/lib/query-keys'
import type { AddMemberInput } from '@/types/member'

export function useMembers(organizationSlug: string) {
  return useQuery({
    queryKey: queryKeys.members(organizationSlug),
    queryFn: () => membersApi.list(organizationSlug),
  })
}

export function useAddMember(organizationSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMemberInput) => membersApi.add(organizationSlug, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members(organizationSlug) }),
  })
}

/** Grant a user a project-scoped role on the given project. */
export function useGrantProjectRole(organizationSlug: string, projectKey: string) {
  return useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      membersApi.grantProjectRole(organizationSlug, projectKey, input),
  })
}
