import { useQuery } from '@tanstack/react-query'

import { flagsApi } from '@/api/endpoints/flags'
import { queryKeys } from '@/lib/query-keys'

export function useFlags(tenantSlug: string, projectKey: string) {
  return useQuery({
    queryKey: queryKeys.flags(tenantSlug, projectKey),
    queryFn: () => flagsApi.list(tenantSlug, projectKey),
  })
}
