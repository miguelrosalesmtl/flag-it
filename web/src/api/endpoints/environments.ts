import { api } from '@/api/client'
import type { Environment } from '@/types/environment'

export const environmentsApi = {
  list: (tenantSlug: string, projectKey: string) =>
    api
      .get<{ environments: Environment[] | null }>(
        `/tenants/${tenantSlug}/projects/${projectKey}/environments`,
      )
      .then((r) => r.environments ?? []),
}
