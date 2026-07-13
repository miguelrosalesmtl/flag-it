import { api } from '@/api/client'
import type { Role } from '@/types/role'

export const rolesApi = {
  list: (tenantSlug: string) =>
    api.get<{ roles: Role[] | null }>(`/tenants/${tenantSlug}/roles`).then((r) => r.roles ?? []),
}
