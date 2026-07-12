import { useQuery } from '@tanstack/react-query'

import { tenantsApi } from '@/api/endpoints/tenants'
import { queryKeys } from '@/lib/query-keys'

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: tenantsApi.list,
  })
}
