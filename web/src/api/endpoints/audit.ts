import { api } from '@/api/client'
import type { AuditEntry } from '@/types/audit'

export const auditApi = {
  // A organization's change history, newest first, optionally filtered by resource type.
  list: (organizationSlug: string, resourceType = '') => {
    const params = new URLSearchParams()
    if (resourceType) params.set('resource_type', resourceType)
    const qs = params.toString()
    return api
      .get<{ entries: AuditEntry[] | null }>(
        `/organizations/${organizationSlug}/audit${qs ? `?${qs}` : ''}`,
      )
      .then((r) => r.entries ?? [])
  },
}
