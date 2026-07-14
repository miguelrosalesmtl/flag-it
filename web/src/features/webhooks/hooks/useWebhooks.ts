import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { webhooksApi } from '@/api/endpoints/webhooks'
import { queryKeys } from '@/lib/query-keys'
import type { CreateWebhookInput } from '@/types/webhook'

export function useWebhooks(organizationSlug: string) {
  return useQuery({
    queryKey: queryKeys.webhooks(organizationSlug),
    queryFn: () => webhooksApi.list(organizationSlug),
  })
}

export function useWebhookDeliveries(organizationSlug: string, id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.webhookDeliveries(organizationSlug, id),
    queryFn: () => webhooksApi.deliveries(organizationSlug, id),
    enabled,
  })
}

function useInvalidateWebhooks(organizationSlug: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.webhooks(organizationSlug) })
}

export function useCreateWebhook(organizationSlug: string) {
  const invalidate = useInvalidateWebhooks(organizationSlug)
  return useMutation({
    mutationFn: (input: CreateWebhookInput) => webhooksApi.create(organizationSlug, input),
    onSuccess: () => void invalidate(),
  })
}

export function useSetWebhookEnabled(organizationSlug: string) {
  const invalidate = useInvalidateWebhooks(organizationSlug)
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      webhooksApi.setEnabled(organizationSlug, id, enabled),
    onSuccess: () => void invalidate(),
  })
}

export function useResetWebhookSecret(organizationSlug: string) {
  const invalidate = useInvalidateWebhooks(organizationSlug)
  return useMutation({
    mutationFn: (id: string) => webhooksApi.reset(organizationSlug, id),
    onSuccess: () => void invalidate(),
  })
}

export function useTestWebhook(organizationSlug: string) {
  return useMutation({
    mutationFn: (id: string) => webhooksApi.test(organizationSlug, id),
  })
}

export function useDeleteWebhook(organizationSlug: string) {
  const invalidate = useInvalidateWebhooks(organizationSlug)
  return useMutation({
    mutationFn: (id: string) => webhooksApi.remove(organizationSlug, id),
    onSuccess: () => void invalidate(),
  })
}
