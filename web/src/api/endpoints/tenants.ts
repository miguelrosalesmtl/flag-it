import { api } from '@/api/client'
import type { Tenant } from '@/types/tenant'

// The API wraps the list in `{ tenants: [...] }`; unwrap it here so callers get
// a plain array.
export const tenantsApi = {
  list: () => api.get<{ tenants: Tenant[] | null }>('/tenants').then((r) => r.tenants ?? []),
  remove: (tenantSlug: string) => api.delete<void>(`/tenants/${tenantSlug}`),
}
