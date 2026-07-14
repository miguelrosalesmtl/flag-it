import { api } from '@/api/client'
import type { CreateWebhookInput, Webhook, WebhookDelivery } from '@/types/webhook'

const base = (organizationSlug: string) => `/organizations/${organizationSlug}/webhooks`

export const webhooksApi = {
  list: (organizationSlug: string) =>
    api
      .get<{ webhooks: Webhook[] | null }>(base(organizationSlug))
      .then((r) => r.webhooks ?? []),
  create: (organizationSlug: string, input: CreateWebhookInput) =>
    api.post<Webhook>(base(organizationSlug), input),
  setEnabled: (organizationSlug: string, id: string, enabled: boolean) =>
    api.post<Webhook>(`${base(organizationSlug)}/${id}/enabled`, { enabled }),
  reset: (organizationSlug: string, id: string) =>
    api.post<Webhook>(`${base(organizationSlug)}/${id}/reset`),
  test: (organizationSlug: string, id: string) =>
    api.post<WebhookDelivery>(`${base(organizationSlug)}/${id}/test`),
  remove: (organizationSlug: string, id: string) =>
    api.delete<void>(`${base(organizationSlug)}/${id}`),
  deliveries: (organizationSlug: string, id: string) =>
    api
      .get<{ deliveries: WebhookDelivery[] | null }>(`${base(organizationSlug)}/${id}/deliveries`)
      .then((r) => r.deliveries ?? []),
}
