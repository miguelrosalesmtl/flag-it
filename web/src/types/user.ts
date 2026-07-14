/**
 * A platform user (superuser-managed). Type-only, zero runtime — the shared
 * vocabulary presentational components use to describe a `User`.
 */
export interface User {
  id: string
  email: string
  full_name: string
  is_superuser: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Payload to create a user (superuser only). */
export interface CreateUserInput {
  email: string
  password: string
  full_name?: string
  is_superuser?: boolean
}

/** Payload to update a user. */
export interface UpdateUserInput {
  full_name: string
  is_active: boolean
}
