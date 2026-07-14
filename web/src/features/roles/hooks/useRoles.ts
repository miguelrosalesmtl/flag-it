import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { rolesApi } from '@/api/endpoints/roles'
import { queryKeys } from '@/lib/query-keys'
import type { CreateRoleInput } from '@/types/role'

export function useRoles(organizationSlug: string) {
  return useQuery({
    queryKey: queryKeys.roles(organizationSlug),
    queryFn: () => rolesApi.list(organizationSlug),
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

export function useCreateRole(organizationSlug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateRoleInput) => rolesApi.create(organizationSlug, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.roles(organizationSlug) }),
  })
}
