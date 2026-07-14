import { api } from '@/api/client'
import type { SaveSegmentInput, Segment } from '@/types/segment'

const segBase = (organizationSlug: string, projectKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}/segments`

export const segmentsApi = {
  list: (organizationSlug: string, projectKey: string, search = '') =>
    api
      .get<{ segments: Segment[] | null }>(
        `${segBase(organizationSlug, projectKey)}?search=${encodeURIComponent(search)}`,
      )
      .then((r) => r.segments ?? []),
  get: (organizationSlug: string, projectKey: string, segKey: string) =>
    api.get<Segment>(`${segBase(organizationSlug, projectKey)}/${segKey}`),
  // Create or update a segment (the key is addressed in the path; PUT).
  save: (organizationSlug: string, projectKey: string, segKey: string, body: SaveSegmentInput) =>
    api.put<Segment>(`${segBase(organizationSlug, projectKey)}/${segKey}`, body),
  remove: (organizationSlug: string, projectKey: string, segKey: string) =>
    api.delete<void>(`${segBase(organizationSlug, projectKey)}/${segKey}`),
}
