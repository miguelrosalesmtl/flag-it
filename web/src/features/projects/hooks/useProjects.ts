import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { projectsApi } from '@/api/endpoints/projects'
import { queryKeys } from '@/lib/query-keys'
import type { CreateProjectInput } from '@/types/project'

export function useProjects(organizationSlug: string) {
  return useQuery({
    queryKey: queryKeys.projects(organizationSlug),
    queryFn: () => projectsApi.list(organizationSlug),
  })
}

export function useCreateProject(organizationSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsApi.create(organizationSlug, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(organizationSlug) }),
  })
}

export function useUpdateProject(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => projectsApi.update(organizationSlug, projectKey, name),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(organizationSlug, projectKey), project)
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects(organizationSlug) })
    },
  })
}

export function useProject(organizationSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.project(organizationSlug, projectKey),
    queryFn: () => projectsApi.get(organizationSlug, projectKey),
  })
}

export function useDeleteProject(organizationSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectKey: string) => projectsApi.remove(organizationSlug, projectKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects(organizationSlug) }),
  })
}
