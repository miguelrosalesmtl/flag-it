import { useQuery } from '@tanstack/react-query'

import { auditApi } from '@/api/endpoints/audit'
import { queryKeys } from '@/lib/query-keys'

/** A tenant's audit log, optionally filtered by resource type. */
export function useAudit(tenantSlug: string, resourceType = '') {
  return useQuery({
    queryKey: [...queryKeys.audit(tenantSlug), resourceType],
    queryFn: () => auditApi.list(tenantSlug, resourceType),
  })
}
