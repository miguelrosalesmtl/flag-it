/** An SDK key for one environment. The secret `key` is returned to managers. */
export interface SdkKey {
  id: string
  environment_id: string
  key: string
  kind: 'server' | 'client'
  name: string
  last_used_at?: string
  revoked_at?: string
  created_at: string
}

/** Payload to mint an SDK key. */
export interface CreateSdkKeyInput {
  kind: 'server' | 'client'
  name?: string
}
