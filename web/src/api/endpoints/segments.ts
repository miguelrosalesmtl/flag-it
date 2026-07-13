import { api } from '@/api/client'
import type { SaveSegmentInput, Segment } from '@/types/segment'

const segBase = (tenantSlug: string, projectKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}/segments`

export const segmentsApi = {
  list: (tenantSlug: string, projectKey: string, search = '') =>
    api
      .get<{ segments: Segment[] | null }>(
        `${segBase(tenantSlug, projectKey)}?search=${encodeURIComponent(search)}`,
      )
      .then((r) => r.segments ?? []),
  get: (tenantSlug: string, projectKey: string, segKey: string) =>
    api.get<Segment>(`${segBase(tenantSlug, projectKey)}/${segKey}`),
  // Create or update a segment (the key is addressed in the path; PUT).
  save: (tenantSlug: string, projectKey: string, segKey: string, body: SaveSegmentInput) =>
    api.put<Segment>(`${segBase(tenantSlug, projectKey)}/${segKey}`, body),
}
