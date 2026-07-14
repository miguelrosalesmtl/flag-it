import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { segmentsApi } from '@/api/endpoints/segments'
import { queryKeys } from '@/lib/query-keys'
import type { CreateSegmentInput, SaveSegmentInput } from '@/types/segment'

export function useSegments(organizationSlug: string, projectKey: string, search = '') {
  return useQuery({
    queryKey: [...queryKeys.segments(organizationSlug, projectKey), search],
    queryFn: () => segmentsApi.list(organizationSlug, projectKey, search),
  })
}

export function useSegment(organizationSlug: string, projectKey: string, segKey: string) {
  return useQuery({
    queryKey: queryKeys.segment(organizationSlug, projectKey, segKey),
    queryFn: () => segmentsApi.get(organizationSlug, projectKey, segKey),
  })
}

const emptyDefinition = {
  included: [],
  excluded: [],
  included_contexts: [],
  excluded_contexts: [],
  rules: [],
}

export function useCreateSegment(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSegmentInput) =>
      segmentsApi.save(organizationSlug, projectKey, input.key, {
        name: input.name,
        description: input.description ?? '',
        ...emptyDefinition,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.segments(organizationSlug, projectKey) }),
  })
}

export function useSaveSegment(organizationSlug: string, projectKey: string, segKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveSegmentInput) => segmentsApi.save(organizationSlug, projectKey, segKey, body),
    onSuccess: (segment) => {
      queryClient.setQueryData(queryKeys.segment(organizationSlug, projectKey, segKey), segment)
      void queryClient.invalidateQueries({ queryKey: queryKeys.segments(organizationSlug, projectKey) })
    },
  })
}

export function useDeleteSegment(organizationSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (segKey: string) => segmentsApi.remove(organizationSlug, projectKey, segKey),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.segments(organizationSlug, projectKey) }),
  })
}
