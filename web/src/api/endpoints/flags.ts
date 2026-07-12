import { api } from '@/api/client'
import type { Flag } from '@/types/flag'

export const flagsApi = {
  list: (tenantSlug: string, projectKey: string) =>
    api
      .get<{ flags: Flag[] }>(`/tenants/${tenantSlug}/projects/${projectKey}/flags`)
      .then((r) => r.flags),
}
