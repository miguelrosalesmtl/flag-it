export type TriggerAction = 'on' | 'off'

/**
 * A flag trigger: an inbound webhook whose URL, when POSTed to, applies a fixed
 * action to a flag in one environment. The `url`/`token` are returned only on
 * create and reset (the token is a write-capable secret shown once).
 */
export interface FlagTrigger {
  id: string
  project_id: string
  environment_id: string
  environment_key: string
  flag_key: string
  action: TriggerAction
  description: string
  enabled: boolean
  exec_count: number
  created_by: string
  created_by_email: string
  created_at: string
  last_executed_at?: string | null
  /** Present only in create/reset responses. */
  token?: string
  /** The full webhook URL — present only in create/reset responses. */
  url?: string
}

/** Payload to create a trigger. */
export interface CreateTriggerInput {
  action: TriggerAction
  description?: string
}
