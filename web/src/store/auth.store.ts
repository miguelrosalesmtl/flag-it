import { create } from 'zustand'

import { clearToken, getToken, setToken } from '@/lib/auth-token'

/**
 * Auth session state.
 *
 * The token is the one piece of auth state the app holds. It is mirrored into
 * the `lib/auth-token` holder (which the API client reads) so the two never
 * drift: every mutation here writes through to that holder. On first load the
 * store hydrates from it, so a refresh keeps you signed in.
 *
 * The *user* is deliberately not kept here — that is server data, so it lives in
 * TanStack Query (`useMe`), which already handles caching and refetching.
 */
interface AuthState {
  token: string | null
  isAuthenticated: boolean
  /** Establish a session (called by login and setup on success). */
  signIn: (token: string) => void
  /** Tear it down. */
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: getToken(),
  isAuthenticated: getToken() !== null,
  signIn: (token) => {
    setToken(token)
    set({ token, isAuthenticated: true })
  },
  signOut: () => {
    clearToken()
    set({ token: null, isAuthenticated: false })
  },
}))
