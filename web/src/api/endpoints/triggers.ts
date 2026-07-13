import { api } from '@/api/client'
import type { CreateTriggerInput, FlagTrigger } from '@/types/trigger'

const base = (tenantSlug: string, projectKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}`

export const triggersApi = {
  // A flag+environment's triggers (tokens/urls omitted server-side).
  list: (tenantSlug: string, projectKey: string, flagKey: string, envKey: string) =>
    api
      .get<{ triggers: FlagTrigger[] | null }>(
        `${base(tenantSlug, projectKey)}/triggers?flag=${flagKey}&env=${envKey}`,
      )
      .then((r) => r.triggers ?? []),
  // Create a trigger; the response carries the one-time url + token.
  create: (
    tenantSlug: string,
    projectKey: string,
    flagKey: string,
    envKey: string,
    input: CreateTriggerInput,
  ) =>
    api.post<FlagTrigger>(
      `${base(tenantSlug, projectKey)}/flags/${flagKey}/environments/${envKey}/triggers`,
      input,
    ),
  setEnabled: (tenantSlug: string, projectKey: string, id: string, enabled: boolean) =>
    api.post<FlagTrigger>(`${base(tenantSlug, projectKey)}/triggers/${id}/enabled`, { enabled }),
  // Reset the token; the response carries the new one-time url.
  reset: (tenantSlug: string, projectKey: string, id: string) =>
    api.post<FlagTrigger>(`${base(tenantSlug, projectKey)}/triggers/${id}/reset`),
  remove: (tenantSlug: string, projectKey: string, id: string) =>
    api.delete<void>(`${base(tenantSlug, projectKey)}/triggers/${id}`),
}
