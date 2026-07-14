import { useQuery } from '@tanstack/react-query'

import { auditApi } from '@/api/endpoints/audit'
import { queryKeys } from '@/lib/query-keys'

/** A organization's audit log, optionally filtered by resource type. */
export function useAudit(organizationSlug: string, resourceType = '') {
  return useQuery({
    queryKey: [...queryKeys.audit(organizationSlug), resourceType],
    queryFn: () => auditApi.list(organizationSlug, resourceType),
  })
}
