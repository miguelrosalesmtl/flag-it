import { api } from '@/api/client'
import type { CreateEnvironmentInput, Environment } from '@/types/environment'

const envBase = (tenantSlug: string, projectKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}/environments`

export const environmentsApi = {
  list: (tenantSlug: string, projectKey: string) =>
    api
      .get<{ environments: Environment[] | null }>(envBase(tenantSlug, projectKey))
      .then((r) => r.environments ?? []),
  create: (tenantSlug: string, projectKey: string, input: CreateEnvironmentInput) =>
    api.post<Environment>(envBase(tenantSlug, projectKey), input),
}
