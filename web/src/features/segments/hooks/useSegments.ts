import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { segmentsApi } from '@/api/endpoints/segments'
import { queryKeys } from '@/lib/query-keys'
import type { CreateSegmentInput, SaveSegmentInput } from '@/types/segment'

export function useSegments(tenantSlug: string, projectKey: string, search = '') {
  return useQuery({
    queryKey: [...queryKeys.segments(tenantSlug, projectKey), search],
    queryFn: () => segmentsApi.list(tenantSlug, projectKey, search),
  })
}

export function useSegment(tenantSlug: string, projectKey: string, segKey: string) {
  return useQuery({
    queryKey: queryKeys.segment(tenantSlug, projectKey, segKey),
    queryFn: () => segmentsApi.get(tenantSlug, projectKey, segKey),
  })
}

const emptyDefinition = {
  included: [],
  excluded: [],
  included_contexts: [],
  excluded_contexts: [],
  rules: [],
}

export function useCreateSegment(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSegmentInput) =>
      segmentsApi.save(tenantSlug, projectKey, input.key, {
        name: input.name,
        description: input.description ?? '',
        ...emptyDefinition,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.segments(tenantSlug, projectKey) }),
  })
}

export function useSaveSegment(tenantSlug: string, projectKey: string, segKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveSegmentInput) => segmentsApi.save(tenantSlug, projectKey, segKey, body),
    onSuccess: (segment) => {
      queryClient.setQueryData(queryKeys.segment(tenantSlug, projectKey, segKey), segment)
      void queryClient.invalidateQueries({ queryKey: queryKeys.segments(tenantSlug, projectKey) })
    },
  })
}

export function useDeleteSegment(tenantSlug: string, projectKey: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (segKey: string) => segmentsApi.remove(tenantSlug, projectKey, segKey),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.segments(tenantSlug, projectKey) }),
  })
}
