import { api } from '@/api/client'
import type { AddMemberInput, Member } from '@/types/member'

export const membersApi = {
  list: (tenantSlug: string) =>
    api
      .get<{ members: Member[] | null }>(`/tenants/${tenantSlug}/members`)
      .then((r) => r.members ?? []),
  add: (tenantSlug: string, input: AddMemberInput) =>
    api.post<unknown>(`/tenants/${tenantSlug}/members`, input),
  // Grant a user a project-scoped role (member.manage).
  grantProjectRole: (
    tenantSlug: string,
    projectKey: string,
    input: { email: string; role: string },
  ) => api.post<unknown>(`/tenants/${tenantSlug}/projects/${projectKey}/roles`, input),
}
