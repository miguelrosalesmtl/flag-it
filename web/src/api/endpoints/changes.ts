import { api } from '@/api/client'
import type { ChangeRequest, ChangeStatus, CreateChangeInput } from '@/types/change'

const base = (tenantSlug: string, projectKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}`

export const changesApi = {
  // A project's change requests, optionally filtered by status.
  list: (tenantSlug: string, projectKey: string, status?: ChangeStatus) =>
    api
      .get<{ changes: ChangeRequest[] | null }>(
        `${base(tenantSlug, projectKey)}/changes${status ? `?status=${status}` : ''}`,
      )
      .then((r) => r.changes ?? []),
  // Propose a change to a flag's config in one environment (held for review).
  create: (
    tenantSlug: string,
    projectKey: string,
    flagKey: string,
    envKey: string,
    input: CreateChangeInput,
  ) =>
    api.post<ChangeRequest>(
      `${base(tenantSlug, projectKey)}/flags/${flagKey}/environments/${envKey}/changes`,
      input,
    ),
  // Approve a pending request — the backend applies its instructions.
  approve: (tenantSlug: string, projectKey: string, id: string, comment = '') =>
    api.post<ChangeRequest>(`${base(tenantSlug, projectKey)}/changes/${id}/approve`, { comment }),
  // Reject a pending request without applying it.
  reject: (tenantSlug: string, projectKey: string, id: string, comment = '') =>
    api.post<ChangeRequest>(`${base(tenantSlug, projectKey)}/changes/${id}/reject`, { comment }),
}
