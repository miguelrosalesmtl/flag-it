import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { tenantsApi } from '@/api/endpoints/tenants'
import { queryKeys } from '@/lib/query-keys'

export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: tenantsApi.list,
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (tenantSlug: string) => tenantsApi.remove(tenantSlug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tenants }),
  })
}
