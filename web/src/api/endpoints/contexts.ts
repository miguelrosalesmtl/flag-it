import { api } from '@/api/client'
import type { ContextDetail, SeenContext } from '@/types/context'

const ctxBase = (tenantSlug: string, projectKey: string, envKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}/environments/${envKey}/contexts`

export const contextsApi = {
  list: (tenantSlug: string, projectKey: string, envKey: string, search = '') =>
    api
      .get<{ contexts: SeenContext[] | null }>(
        `${ctxBase(tenantSlug, projectKey, envKey)}?search=${encodeURIComponent(search)}`,
      )
      .then((r) => r.contexts ?? []),
  get: (tenantSlug: string, projectKey: string, envKey: string, kind: string, key: string) =>
    api.get<ContextDetail>(
      `${ctxBase(tenantSlug, projectKey, envKey)}/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`,
    ),
}
