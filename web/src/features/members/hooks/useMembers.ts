import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { membersApi } from '@/api/endpoints/members'
import { queryKeys } from '@/lib/query-keys'
import type { AddMemberInput } from '@/types/member'

export function useMembers(tenantSlug: string) {
  return useQuery({
    queryKey: queryKeys.members(tenantSlug),
    queryFn: () => membersApi.list(tenantSlug),
  })
}

export function useAddMember(tenantSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMemberInput) => membersApi.add(tenantSlug, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.members(tenantSlug) }),
  })
}
