import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectsApi } from '@/api/endpoints/projects'
import { queryKeys } from '@/lib/query-keys'
import type { CreateProjectInput } from '@/types/project'

export function useProjects(tenantSlug: string) {
  return useQuery({
    queryKey: queryKeys.projects(tenantSlug),
    queryFn: () => projectsApi.list(tenantSlug),
  })
}

export function useCreateProject(tenantSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(tenantSlug, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(tenantSlug) }),
  })
}

export function useUpdateProject(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => projectsApi.update(tenantSlug, projectKey, name),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(tenantSlug, projectKey), project)
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects(tenantSlug) })
    },
  })
}

export function useProject(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.project(tenantSlug, projectKey),
    queryFn: () => projectsApi.get(tenantSlug, projectKey),
  })
}
