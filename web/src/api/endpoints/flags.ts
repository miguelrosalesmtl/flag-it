import { api } from '@/api/client'
import type { Flag, FlagConfig } from '@/types/flag'

const flagBase = (tenantSlug: string, projectKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}/flags`

export const flagsApi = {
  list: (tenantSlug: string, projectKey: string) =>
    api.get<{ flags: Flag[] }>(flagBase(tenantSlug, projectKey)).then((r) => r.flags),
  get: (tenantSlug: string, projectKey: string, flagKey: string) =>
    api.get<Flag>(`${flagBase(tenantSlug, projectKey)}/${flagKey}`),
  getConfig: (tenantSlug: string, projectKey: string, flagKey: string, envKey: string) =>
    api.get<FlagConfig>(`${flagBase(tenantSlug, projectKey)}/${flagKey}/environments/${envKey}`),
  // Toggle via a semantic instruction — surgical and concurrency-safe, unlike a
  // full-config replace. Returns the updated config.
  toggle: (tenantSlug: string, projectKey: string, flagKey: string, envKey: string, on: boolean) =>
    api.patch<FlagConfig>(
      `${flagBase(tenantSlug, projectKey)}/${flagKey}/environments/${envKey}`,
      { instructions: [{ kind: on ? 'turnFlagOn' : 'turnFlagOff' }] },
    ),
}
