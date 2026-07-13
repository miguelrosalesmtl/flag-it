import { api } from '@/api/client'
import type { CreateRoleInput, Role } from '@/types/role'

export const rolesApi = {
  list: (tenantSlug: string) =>
    api.get<{ roles: Role[] | null }>(`/tenants/${tenantSlug}/roles`).then((r) => r.roles ?? []),
  permissions: () =>
    api.get<{ permissions: string[] | null }>('/permissions').then((r) => r.permissions ?? []),
  create: (tenantSlug: string, input: CreateRoleInput) =>
    api.post<Role>(`/tenants/${tenantSlug}/roles`, input),
}
