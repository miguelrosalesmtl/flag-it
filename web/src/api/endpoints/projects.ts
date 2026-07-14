import { api } from '@/api/client'
import type { CreateProjectInput, Project } from '@/types/project'

export const projectsApi = {
  list: (organizationSlug: string) =>
    api
      .get<{ projects: Project[] | null }>(`/organizations/${organizationSlug}/projects`)
      .then((r) => r.projects ?? []),
  get: (organizationSlug: string, projectKey: string) =>
    api.get<Project>(`/organizations/${organizationSlug}/projects/${projectKey}`),
  create: (organizationSlug: string, input: CreateProjectInput) =>
    api
      .post<{ project: Project }>(`/organizations/${organizationSlug}/projects`, input)
      .then((r) => r.project),
  update: (organizationSlug: string, projectKey: string, name: string) =>
    api.patch<Project>(`/organizations/${organizationSlug}/projects/${projectKey}`, { name }),
  remove: (organizationSlug: string, projectKey: string) =>
    api.delete<void>(`/organizations/${organizationSlug}/projects/${projectKey}`),
}
