import { useQuery } from '@tanstack/react-query'

import { segmentsApi } from '@/api/endpoints/segments'
import { queryKeys } from '@/lib/query-keys'

export function useSegments(tenantSlug: string, projectKey: string, search = '') {
  return useQuery({
    queryKey: [...queryKeys.segments(tenantSlug, projectKey), search],
    queryFn: () => segmentsApi.list(tenantSlug, projectKey, search),
  })
}
