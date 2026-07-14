import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { organizationsApi } from '@/api/endpoints/organizations'
import { queryKeys } from '@/lib/query-keys'

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations,
    queryFn: organizationsApi.list,
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (organizationSlug: string) => organizationsApi.remove(organizationSlug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations }),
  })
}
