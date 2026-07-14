import { api } from '@/api/client'
import type {
  CreateFlagInput,
  Flag,
  FlagConfig,
  FlagInstruction,
  FlagLifecycle,
  FlagWithState,
} from '@/types/flag'

const flagBase = (organizationSlug: string, projectKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}/flags`

export const flagsApi = {
  list: (organizationSlug: string, projectKey: string) =>
    api
      .get<{ flags: Flag[] | null }>(flagBase(organizationSlug, projectKey))
      .then((r) => r.flags ?? []),
  // Flags with their on/off state in one environment (for the flag list).
  // A non-empty search filters server-side by name, key, or description.
  listInEnv: (organizationSlug: string, projectKey: string, envKey: string, search = '') =>
    api
      .get<{ flags: FlagWithState[] | null }>(
        `/organizations/${organizationSlug}/projects/${projectKey}/environments/${envKey}/flags?search=${encodeURIComponent(search)}`,
      )
      .then((r) => r.flags ?? []),
  // Create/update a flag definition. The key is addressed in the path (PUT).
  create: (organizationSlug: string, projectKey: string, input: CreateFlagInput) =>
    api.put<Flag>(`${flagBase(organizationSlug, projectKey)}/${input.key}`, {
      name: input.name,
      description: input.description ?? '',
      client_side_available: input.client_side_available ?? false,
      temporary: input.temporary ?? false,
      variations: input.variations,
    }),
  // Flags annotated with a lifecycle status (new/active/inactive) for stale
  // detection.
  listLifecycle: (organizationSlug: string, projectKey: string) =>
    api
      .get<{ flags: FlagLifecycle[] | null }>(`${flagBase(organizationSlug, projectKey)}/lifecycle`)
      .then((r) => r.flags ?? []),
  get: (organizationSlug: string, projectKey: string, flagKey: string) =>
    api.get<Flag>(`${flagBase(organizationSlug, projectKey)}/${flagKey}`),
  remove: (organizationSlug: string, projectKey: string, flagKey: string) =>
    api.delete<void>(`${flagBase(organizationSlug, projectKey)}/${flagKey}`),
  getConfig: (organizationSlug: string, projectKey: string, flagKey: string, envKey: string) =>
    api.get<FlagConfig>(`${flagBase(organizationSlug, projectKey)}/${flagKey}/environments/${envKey}`),
  // Toggle via a semantic instruction — surgical and concurrency-safe, unlike a
  // full-config replace. Returns the updated config.
  toggle: (organizationSlug: string, projectKey: string, flagKey: string, envKey: string, on: boolean) =>
    api.patch<FlagConfig>(
      `${flagBase(organizationSlug, projectKey)}/${flagKey}/environments/${envKey}`,
      { instructions: [{ kind: on ? 'turnFlagOn' : 'turnFlagOff' }] },
    ),
  // Apply semantic instructions (updateOffVariation, addTargets, …) to a config.
  patchConfig: (
    organizationSlug: string,
    projectKey: string,
    flagKey: string,
    envKey: string,
    instructions: FlagInstruction[],
  ) =>
    api.patch<FlagConfig>(
      `${flagBase(organizationSlug, projectKey)}/${flagKey}/environments/${envKey}`,
      { instructions },
    ),
}
