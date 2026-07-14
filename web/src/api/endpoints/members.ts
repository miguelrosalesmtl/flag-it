import { api } from '@/api/client'
import type { AddMemberInput, Member } from '@/types/member'

export const membersApi = {
  list: (organizationSlug: string) =>
    api
      .get<{ members: Member[] | null }>(`/organizations/${organizationSlug}/members`)
      .then((r) => r.members ?? []),
  add: (organizationSlug: string, input: AddMemberInput) =>
    api.post<unknown>(`/organizations/${organizationSlug}/members`, input),
  // Grant a user a project-scoped role (member.manage).
  grantProjectRole: (
    organizationSlug: string,
    projectKey: string,
    input: { email: string; role: string },
  ) => api.post<unknown>(`/organizations/${organizationSlug}/projects/${projectKey}/roles`, input),
}
