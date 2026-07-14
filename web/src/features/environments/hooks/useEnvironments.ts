import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { environmentsApi } from '@/api/endpoints/environments'
import { queryKeys } from '@/lib/query-keys'
import type { CreateEnvironmentInput } from '@/types/environment'

export function useEnvironments(organizationSlug: string, projectKey: string, search = '') {
  return useQuery({
    queryKey: [...queryKeys.environments(organizationSlug, projectKey), search],
    queryFn: () => environmentsApi.list(organizationSlug, projectKey, search),
  })
}

export function useCreateEnvironment(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEnvironmentInput) =>
      environmentsApi.create(organizationSlug, projectKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.environments(organizationSlug, projectKey) }),
  })
}
