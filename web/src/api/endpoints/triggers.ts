import { api } from '@/api/client'
import type { CreateTriggerInput, FlagTrigger } from '@/types/trigger'

const base = (organizationSlug: string, projectKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}`

export const triggersApi = {
  // A flag+environment's triggers (tokens/urls omitted server-side).
  list: (organizationSlug: string, projectKey: string, flagKey: string, envKey: string) =>
    api
      .get<{ triggers: FlagTrigger[] | null }>(
        `${base(organizationSlug, projectKey)}/triggers?flag=${flagKey}&env=${envKey}`,
      )
      .then((r) => r.triggers ?? []),
  // Create a trigger; the response carries the one-time url + token.
  create: (
    organizationSlug: string,
    projectKey: string,
    flagKey: string,
    envKey: string,
    input: CreateTriggerInput,
  ) =>
    api.post<FlagTrigger>(
      `${base(organizationSlug, projectKey)}/flags/${flagKey}/environments/${envKey}/triggers`,
      input,
    ),
  setEnabled: (organizationSlug: string, projectKey: string, id: string, enabled: boolean) =>
    api.post<FlagTrigger>(`${base(organizationSlug, projectKey)}/triggers/${id}/enabled`, { enabled }),
  // Reset the token; the response carries the new one-time url.
  reset: (organizationSlug: string, projectKey: string, id: string) =>
    api.post<FlagTrigger>(`${base(organizationSlug, projectKey)}/triggers/${id}/reset`),
  remove: (organizationSlug: string, projectKey: string, id: string) =>
    api.delete<void>(`${base(organizationSlug, projectKey)}/triggers/${id}`),
}
