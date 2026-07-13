import { useQuery } from '@tanstack/react-query'

import { rolesApi } from '@/api/endpoints/roles'
import { queryKeys } from '@/lib/query-keys'

export function useRoles(tenantSlug: string) {
  return useQuery({
    queryKey: queryKeys.roles(tenantSlug),
    queryFn: () => rolesApi.list(tenantSlug),
  })
}
