import { api } from '@/api/client'
import type { ContextDetail, SeenContext } from '@/types/context'

const ctxBase = (organizationSlug: string, projectKey: string, envKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}/environments/${envKey}/contexts`

export const contextsApi = {
  list: (organizationSlug: string, projectKey: string, envKey: string, search = '') =>
    api
      .get<{ contexts: SeenContext[] | null }>(
        `${ctxBase(organizationSlug, projectKey, envKey)}?search=${encodeURIComponent(search)}`,
      )
      .then((r) => r.contexts ?? []),
  get: (organizationSlug: string, projectKey: string, envKey: string, kind: string, key: string) =>
    api.get<ContextDetail>(
      `${ctxBase(organizationSlug, projectKey, envKey)}/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`,
    ),
}
