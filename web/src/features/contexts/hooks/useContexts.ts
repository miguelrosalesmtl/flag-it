import { useQuery } from '@tanstack/react-query'

import { contextsApi } from '@/api/endpoints/contexts'
import { queryKeys } from '@/lib/query-keys'

export function useContexts(
  tenantSlug: string,
  projectKey: string,
  envKey: string,
  search = '',
) {
  return useQuery({
    queryKey: [...queryKeys.contexts(tenantSlug, projectKey, envKey), search],
    queryFn: () => contextsApi.list(tenantSlug, projectKey, envKey, search),
    enabled: envKey !== '',
  })
}

export function useContext(
  tenantSlug: string,
  projectKey: string,
  envKey: string,
  kind: string,
  key: string,
) {
  return useQuery({
    queryKey: queryKeys.context(tenantSlug, projectKey, envKey, kind, key),
    queryFn: () => contextsApi.get(tenantSlug, projectKey, envKey, kind, key),
    enabled: envKey !== '' && kind !== '' && key !== '',
  })
}
