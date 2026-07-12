/**
 * Auth domain types. Type-only, zero runtime — importable from any layer.
 *
 * `AuthUser` mirrors the backend `User` (GET /me, POST /auth/login). Note there
 * is no password field: the hash never leaves the server.
 */
export interface AuthUser {
  id: string
  email: string
  full_name: string
  is_superuser: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginInput {
  email: string
  password: string
}

/** What a successful login/setup establishes: a token plus the user it belongs to. */
export interface Session {
  token: string
  user: AuthUser
}
