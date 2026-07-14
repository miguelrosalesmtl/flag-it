import { api } from '@/api/client'
import type {
  CreateScheduledChangeInput,
  ScheduledChange,
  ScheduledStatus,
} from '@/types/scheduled-change'

const base = (organizationSlug: string, projectKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}`

export const scheduledChangesApi = {
  // A project's scheduled changes, optionally filtered by status/flag/env.
  list: (
    organizationSlug: string,
    projectKey: string,
    filters: { status?: ScheduledStatus; flag?: string; env?: string } = {},
  ) => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.flag) params.set('flag', filters.flag)
    if (filters.env) params.set('env', filters.env)
    const qs = params.toString()
    return api
      .get<{ scheduled_changes: ScheduledChange[] | null }>(
        `${base(organizationSlug, projectKey)}/scheduled-changes${qs ? `?${qs}` : ''}`,
      )
      .then((r) => r.scheduled_changes ?? [])
  },
  // Schedule a change to a flag in one environment.
  create: (
    organizationSlug: string,
    projectKey: string,
    flagKey: string,
    envKey: string,
    input: CreateScheduledChangeInput,
  ) =>
    api.post<ScheduledChange>(
      `${base(organizationSlug, projectKey)}/flags/${flagKey}/environments/${envKey}/scheduled-changes`,
      input,
    ),
  // Cancel a pending scheduled change.
  cancel: (organizationSlug: string, projectKey: string, id: string) =>
    api.post<ScheduledChange>(`${base(organizationSlug, projectKey)}/scheduled-changes/${id}/cancel`),
}
