import { api } from '@/api/client'
import type { CreateRoleInput, Role } from '@/types/role'

export const rolesApi = {
  list: (organizationSlug: string) =>
    api.get<{ roles: Role[] | null }>(`/organizations/${organizationSlug}/roles`).then((r) => r.roles ?? []),
  permissions: () =>
    api.get<{ permissions: string[] | null }>('/permissions').then((r) => r.permissions ?? []),
  create: (organizationSlug: string, input: CreateRoleInput) =>
    api.post<Role>(`/organizations/${organizationSlug}/roles`, input),
}
