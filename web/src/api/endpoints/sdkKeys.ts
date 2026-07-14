import { api } from '@/api/client'
import type { CreateSdkKeyInput, SdkKey } from '@/types/sdk-key'

const keyBase = (organizationSlug: string, projectKey: string, envKey: string) =>
  `/organizations/${organizationSlug}/projects/${projectKey}/environments/${envKey}/sdk-keys`

export const sdkKeysApi = {
  list: (organizationSlug: string, projectKey: string, envKey: string) =>
    api
      .get<{ sdk_keys: SdkKey[] | null }>(keyBase(organizationSlug, projectKey, envKey))
      .then((r) => r.sdk_keys ?? []),
  create: (organizationSlug: string, projectKey: string, envKey: string, input: CreateSdkKeyInput) =>
    api.post<SdkKey>(keyBase(organizationSlug, projectKey, envKey), input),
  revoke: (organizationSlug: string, projectKey: string, envKey: string, keyId: string) =>
    api.delete<void>(`${keyBase(organizationSlug, projectKey, envKey)}/${keyId}`),
}
