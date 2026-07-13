import { api } from '@/api/client'
import type { CreateSdkKeyInput, SdkKey } from '@/types/sdk-key'

const keyBase = (tenantSlug: string, projectKey: string, envKey: string) =>
  `/tenants/${tenantSlug}/projects/${projectKey}/environments/${envKey}/sdk-keys`

export const sdkKeysApi = {
  list: (tenantSlug: string, projectKey: string, envKey: string) =>
    api
      .get<{ sdk_keys: SdkKey[] | null }>(keyBase(tenantSlug, projectKey, envKey))
      .then((r) => r.sdk_keys ?? []),
  create: (tenantSlug: string, projectKey: string, envKey: string, input: CreateSdkKeyInput) =>
    api.post<SdkKey>(keyBase(tenantSlug, projectKey, envKey), input),
  revoke: (tenantSlug: string, projectKey: string, envKey: string, keyId: string) =>
    api.delete<void>(`${keyBase(tenantSlug, projectKey, envKey)}/${keyId}`),
}
