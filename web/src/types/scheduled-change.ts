import type { FlagInstruction } from '@/types/flag'

export type ScheduledStatus = 'pending' | 'applied' | 'cancelled' | 'failed'

/**
 * A set of semantic instructions to apply to a flag's config in one environment
 * at a future time. A background scheduler applies pending ones once
 * `scheduled_for` passes; a pending one can be cancelled before then.
 */
export interface ScheduledChange {
  id: string
  project_id: string
  environment_id: string
  environment_key: string
  flag_key: string
  instructions: FlagInstruction[]
  comment: string
  scheduled_for: string
  status: ScheduledStatus
  error?: string
  created_by: string
  created_by_email: string
  created_at: string
  applied_at?: string | null
}

/** Payload to schedule a change: when to apply it, the instructions, and why. */
export interface CreateScheduledChangeInput {
  scheduled_for: string
  instructions: FlagInstruction[]
  comment?: string
}
