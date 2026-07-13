import type { FlagInstruction } from '@/types/flag'

export type ChangeStatus = 'pending' | 'approved' | 'rejected'

/**
 * A proposed change to a flag's config in one environment, held for review. The
 * instructions are the same semantic edits used by the flag PATCH; they are
 * applied only when a reviewer approves.
 */
export interface ChangeRequest {
  id: string
  project_id: string
  environment_id: string
  environment_key: string
  flag_key: string
  instructions: FlagInstruction[]
  comment: string
  status: ChangeStatus
  requested_by: string
  requested_by_email: string
  reviewed_by?: string | null
  reviewed_by_email?: string
  review_comment?: string
  created_at: string
  reviewed_at?: string | null
}

/** Payload to propose a change: the instructions plus an optional rationale. */
export interface CreateChangeInput {
  comment?: string
  instructions: FlagInstruction[]
}
