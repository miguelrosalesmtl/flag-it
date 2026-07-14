import { api } from '@/api/client'
import type { Organization } from '@/types/organization'

// The API wraps the list in `{ organizations: [...] }`; unwrap it here so callers get
// a plain array.
export const organizationsApi = {
  list: () => api.get<{ organizations: Organization[] | null }>('/organizations').then((r) => r.organizations ?? []),
  remove: (organizationSlug: string) => api.delete<void>(`/organizations/${organizationSlug}`),
}
