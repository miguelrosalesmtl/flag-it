/**
 * A tenant's outbound webhook: a URL that receives signed POSTs when subscribed
 * events occur. The `secret` is returned only on create/reset (shown once).
 */
export interface Webhook {
  id: string
  tenant_id: string
  url: string
  secret?: string
  event_types: string[]
  description: string
  enabled: boolean
  created_by: string
  created_by_email: string
  created_at: string
}

/** One attempt-tracked delivery of an event to a webhook. */
export interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  status: 'pending' | 'success' | 'failed'
  attempts: number
  response_status: number
  error?: string
  next_attempt_at: string
  created_at: string
  delivered_at?: string | null
}

export interface CreateWebhookInput {
  url: string
  event_types: string[]
  description?: string
}

/** Subscribes to every event. */
export const EVENT_TYPE_ALL = '*'

/** Curated events a webhook can subscribe to (besides "all"). */
export const WEBHOOK_EVENT_TYPES: { value: string; label: string }[] = [
  { value: 'flag.saved', label: 'Flag saved' },
  { value: 'flag.config.patched', label: 'Flag config changed' },
  { value: 'flag.deleted', label: 'Flag deleted' },
  { value: 'change.requested', label: 'Change requested' },
  { value: 'change.approved', label: 'Change approved' },
  { value: 'change.rejected', label: 'Change rejected' },
  { value: 'trigger.fired', label: 'Trigger fired' },
]
