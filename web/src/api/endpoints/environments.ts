import { api } from '@/api/client'
import type { CreateEnvironmentInput, Environment } from '@/types/environment'

const envBase = (organizationSlug: string, projectKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}/environments`

export const environmentsApi = {
  list: (organizationSlug: string, projectKey: string, search = '') =>
    api
      .get<{ environments: Environment[] | null }>(
        `${envBase(organizationSlug, projectKey)}?search=${encodeURIComponent(search)}`,
      )
      .then((r) => r.environments ?? []),
  create: (organizationSlug: string, projectKey: string, input: CreateEnvironmentInput) =>
    api.post<Environment>(envBase(organizationSlug, projectKey), input),
}
