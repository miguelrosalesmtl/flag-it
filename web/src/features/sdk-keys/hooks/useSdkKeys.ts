import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { sdkKeysApi } from '@/api/endpoints/sdkKeys'
import { queryKeys } from '@/lib/query-keys'
import type { CreateSdkKeyInput } from '@/types/sdk-key'

export function useSdkKeys(organizationSlug: string, projectKey: string, envKey: string) {
  return useQuery({
    queryKey: queryKeys.sdkKeys(organizationSlug, projectKey, envKey),
    queryFn: () => sdkKeysApi.list(organizationSlug, projectKey, envKey),
    enabled: envKey !== '',
  })
}

export function useCreateSdkKey(organizationSlug: string, projectKey: string, envKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSdkKeyInput) =>
      sdkKeysApi.create(organizationSlug, projectKey, envKey, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sdkKeys(organizationSlug, projectKey, envKey) }),
  })
}

export function useRevokeSdkKey(organizationSlug: string, projectKey: string, envKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (keyId: string) => sdkKeysApi.revoke(organizationSlug, projectKey, envKey, keyId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sdkKeys(organizationSlug, projectKey, envKey) }),
  })
}
