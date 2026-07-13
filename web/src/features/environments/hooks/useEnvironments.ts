import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { environmentsApi } from '@/api/endpoints/environments'
import { queryKeys } from '@/lib/query-keys'
import type { CreateEnvironmentInput } from '@/types/environment'

export function useEnvironments(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.environments(tenantSlug, projectKey),
    queryFn: () => environmentsApi.list(tenantSlug, projectKey),
  })
}

export function useCreateEnvironment(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEnvironmentInput) =>
      environmentsApi.create(tenantSlug, projectKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.environments(tenantSlug, projectKey) }),
  })
}
