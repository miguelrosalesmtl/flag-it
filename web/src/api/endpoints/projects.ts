import { api } from '@/api/client'
import type { CreateProjectInput, Project } from '@/types/project'

export const projectsApi = {
  list: (tenantSlug: string) =>
    api
      .get<{ projects: Project[] | null }>(`/tenants/${tenantSlug}/projects`)
      .then((r) => r.projects ?? []),
  get: (tenantSlug: string, projectKey: string) =>
    api.get<Project>(`/tenants/${tenantSlug}/projects/${projectKey}`),
  create: (tenantSlug: string, input: CreateProjectInput) =>
    api
      .post<{ project: Project }>(`/tenants/${tenantSlug}/projects`, input)
      .then((r) => r.project),
}
