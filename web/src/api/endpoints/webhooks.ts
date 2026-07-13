import { api } from '@/api/client'
import type { CreateWebhookInput, Webhook, WebhookDelivery } from '@/types/webhook'

const base = (tenantSlug: string) => `/tenants/${tenantSlug}/webhooks`

export const webhooksApi = {
  list: (tenantSlug: string) =>
    api
      .get<{ webhooks: Webhook[] | null }>(base(tenantSlug))
      .then((r) => r.webhooks ?? []),
  create: (tenantSlug: string, input: CreateWebhookInput) =>
    api.post<Webhook>(base(tenantSlug), input),
  setEnabled: (tenantSlug: string, id: string, enabled: boolean) =>
    api.post<Webhook>(`${base(tenantSlug)}/${id}/enabled`, { enabled }),
  reset: (tenantSlug: string, id: string) =>
    api.post<Webhook>(`${base(tenantSlug)}/${id}/reset`),
  test: (tenantSlug: string, id: string) =>
    api.post<WebhookDelivery>(`${base(tenantSlug)}/${id}/test`),
  remove: (tenantSlug: string, id: string) =>
    api.delete<void>(`${base(tenantSlug)}/${id}`),
  deliveries: (tenantSlug: string, id: string) =>
    api
      .get<{ deliveries: WebhookDelivery[] | null }>(`${base(tenantSlug)}/${id}/deliveries`)
      .then((r) => r.deliveries ?? []),
}
