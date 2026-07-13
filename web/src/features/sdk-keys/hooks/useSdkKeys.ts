import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { sdkKeysApi } from '@/api/endpoints/sdkKeys'
import { queryKeys } from '@/lib/query-keys'
import type { CreateSdkKeyInput } from '@/types/sdk-key'

export function useSdkKeys(tenantSlug: string, projectKey: string, envKey: string) {
  return useQuery({
    queryKey: queryKeys.sdkKeys(tenantSlug, projectKey, envKey),
    queryFn: () => sdkKeysApi.list(tenantSlug, projectKey, envKey),
    enabled: envKey !== '',
  })
}

export function useCreateSdkKey(tenantSlug: string, projectKey: string, envKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSdkKeyInput) =>
      sdkKeysApi.create(tenantSlug, projectKey, envKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sdkKeys(tenantSlug, projectKey, envKey) }),
  })
}

export function useRevokeSdkKey(tenantSlug: string, projectKey: string, envKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (keyId: string) => sdkKeysApi.revoke(tenantSlug, projectKey, envKey, keyId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sdkKeys(tenantSlug, projectKey, envKey) }),
  })
}
