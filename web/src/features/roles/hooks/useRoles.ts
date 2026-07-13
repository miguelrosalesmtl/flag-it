import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { rolesApi } from '@/api/endpoints/roles'
import { queryKeys } from '@/lib/query-keys'
import type { CreateRoleInput } from '@/types/role'

export function useRoles(tenantSlug: string) {
  return useQuery({
    queryKey: queryKeys.roles(tenantSlug),
    queryFn: () => rolesApi.list(tenantSlug),
  })
}

/** The permission vocabulary roles can grant (rarely changes). */
export function usePermissions() {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: rolesApi.permissions,
    staleTime: Infinity,
  })
}

export function useCreateRole(tenantSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rolesApi.create(tenantSlug, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles(tenantSlug) }),
  })
}
