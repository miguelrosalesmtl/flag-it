/** A organization member with their organization-scoped role (if any). */
export interface Member {
  user_id: string
  email: string
  full_name: string
  role: string
}

/** Payload to add a member to a organization. */
export interface AddMemberInput {
  email: string
  role?: string
}
