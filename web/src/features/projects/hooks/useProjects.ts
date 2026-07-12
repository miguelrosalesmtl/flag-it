import { useQuery } from '@tanstack/react-query'

import { projectsApi } from '@/api/endpoints/projects'
import { queryKeys } from '@/lib/query-keys'

export function useProjects(tenantSlug: string) {
  return useQuery({
    queryKey: queryKeys.projects(tenantSlug),
    queryFn: () => projectsApi.list(tenantSlug),
  })
}

export function useProject(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.project(tenantSlug, projectKey),
    queryFn: () => projectsApi.get(tenantSlug, projectKey),
  })
}
