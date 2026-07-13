/** A tenant member with their tenant-scoped role (if any). */
export interface Member {
  user_id: string
  email: string
  full_name: string
  role: string
}

/** Payload to add a member to a tenant. */
export interface AddMemberInput {
  email: string
  role?: string
}
