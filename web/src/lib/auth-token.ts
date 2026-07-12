/**
 * The bearer token holder. Lives in `lib` on purpose.
 *
 * The API client must attach `Authorization` to every request, but the boundary
 * matrix forbids `api` from importing `store`. So the token lives here, in a
 * layer both `api` (reads it) and `store` (writes it) are allowed to touch. The
 * zustand auth store is the writer; this module is the single source of truth
 * the transport reads at request time.
 *
 * Backed by localStorage so a page refresh keeps the session, with an in-memory
 * cache so the hot path never hits storage.
 */
const STORAGE_KEY = 'flagit.token'

let cached: string | null | undefined

export function getToken(): string | null {
  if (cached !== undefined) return cached
  try {
    cached = localStorage.getItem(STORAGE_KEY)
  } catch {
    cached = null
  }
  return cached
}

export function setToken(token: string): void {
  cached = token
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Private mode / storage disabled: the in-memory copy still works for this session.
  }
}

export function clearToken(): void {
  cached = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
