import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authApi } from '@/api/endpoints/auth'
import { ApiError } from '@/api/client'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'
import type { LoginInput } from '@/types/auth'

/** The current user, fetched once we hold a token. The source of truth for identity. */
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: isAuthenticated,
    retry: false,
  })
}

/**
 * Log in. On success we establish the session and seed the `me` cache from the
 * login response, so no extra /me round-trip is needed. Transport-level errors
 * are translated to a human message here — the container just displays it.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  const signIn = useAuthStore((s) => s.signIn)

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      try {
        return await authApi.login(input)
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          throw new Error('Invalid email or password.', { cause: err })
        }
        throw err
      }
    },
    onSuccess: (session) => {
      signIn(session.token)
      queryClient.setQueryData(queryKeys.me, session.user)
    },
  })
}

/** Sign out and drop all cached server data so nothing leaks across sessions. */
export function useLogout() {
  const queryClient = useQueryClient()
  const signOut = useAuthStore((s) => s.signOut)

  return () => {
    signOut()
    queryClient.clear()
  }
}
