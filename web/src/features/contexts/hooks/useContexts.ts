import { useQuery } from '@tanstack/react-query'

import { contextsApi } from '@/api/endpoints/contexts'
import { queryKeys } from '@/lib/query-keys'

export function useContexts(
  organizationSlug: string,
  projectKey: string,
  envKey: string,
  search = '',
) {
  return useQuery({
    queryKey: [...queryKeys.contexts(organizationSlug, projectKey, envKey), search],
    queryFn: () => contextsApi.list(organizationSlug, projectKey, envKey, search),
    enabled: envKey !== '',
  })
}

export function useContext(
  organizationSlug: string,
  projectKey: string,
  envKey: string,
  kind: string,
  key: string,
) {
  return useQuery({
    queryKey: queryKeys.context(organizationSlug, projectKey, envKey, kind, key),
    queryFn: () => contextsApi.get(organizationSlug, projectKey, envKey, kind, key),
    enabled: envKey !== '' && kind !== '' && key !== '',
  })
}
