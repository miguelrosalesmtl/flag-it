/**
 * Domain types.
 *
 * Type-only, zero runtime. Every layer may import from here — it is the shared
 * vocabulary that lets a presentational component describe the shape of a
 * `User` without reaching into the API layer to get it.
 */
export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
}

export type CreateUserInput = Omit<User, 'id'>
