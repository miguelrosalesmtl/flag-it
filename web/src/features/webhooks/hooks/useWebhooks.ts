import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { webhooksApi } from '@/api/endpoints/webhooks'
import { queryKeys } from '@/lib/query-keys'
import type { CreateWebhookInput } from '@/types/webhook'

export function useWebhooks(tenantSlug: string) {
  return useQuery({
    queryKey: queryKeys.webhooks(tenantSlug),
    queryFn: () => webhooksApi.list(tenantSlug),
  })
}

export function useWebhookDeliveries(tenantSlug: string, id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.webhookDeliveries(tenantSlug, id),
    queryFn: () => webhooksApi.deliveries(tenantSlug, id),
    enabled,
  })
}

function useInvalidateWebhooks(tenantSlug: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.webhooks(tenantSlug) })
}

export function useCreateWebhook(tenantSlug: string) {
  const invalidate = useInvalidateWebhooks(tenantSlug)
  return useMutation({
    mutationFn: (input: CreateWebhookInput) => webhooksApi.create(tenantSlug, input),
    onSuccess: () => void invalidate(),
  })
}

export function useSetWebhookEnabled(tenantSlug: string) {
  const invalidate = useInvalidateWebhooks(tenantSlug)
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      webhooksApi.setEnabled(tenantSlug, id, enabled),
    onSuccess: () => void invalidate(),
  })
}

export function useResetWebhookSecret(tenantSlug: string) {
  const invalidate = useInvalidateWebhooks(tenantSlug)
  return useMutation({
    mutationFn: (id: string) => webhooksApi.reset(tenantSlug, id),
    onSuccess: () => void invalidate(),
  })
}

export function useTestWebhook(tenantSlug: string) {
  return useMutation({
    mutationFn: (id: string) => webhooksApi.test(tenantSlug, id),
  })
}

export function useDeleteWebhook(tenantSlug: string) {
  const invalidate = useInvalidateWebhooks(tenantSlug)
  return useMutation({
    mutationFn: (id: string) => webhooksApi.remove(tenantSlug, id),
    onSuccess: () => void invalidate(),
  })
}
