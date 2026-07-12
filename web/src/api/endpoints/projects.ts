import { api } from '@/api/client'
import type { Project } from '@/types/project'

export const projectsApi = {
  list: (tenantSlug: string) =>
    api
      .get<{ projects: Project[] }>(`/tenants/${tenantSlug}/projects`)
      .then((r) => r.projects),
  get: (tenantSlug: string, projectKey: string) =>
    api.get<Project>(`/tenants/${tenantSlug}/projects/${projectKey}`),
}
