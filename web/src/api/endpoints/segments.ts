import { api } from '@/api/client'
import type { Segment } from '@/types/segment'

export const segmentsApi = {
  list: (tenantSlug: string, projectKey: string) =>
    api
      .get<{ segments: Segment[] | null }>(
        `/tenants/${tenantSlug}/projects/${projectKey}/segments`,
      )
      .then((r) => r.segments ?? []),
}
