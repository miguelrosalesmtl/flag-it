import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { setupApi } from '@/api/endpoints/setup'
import { ApiError } from '@/api/client'
import { queryKeys } from '@/lib/query-keys'
import { useAuthStore } from '@/store/auth.store'
import type { SetupInput, SetupStatus } from '@/types/setup'

/**
 * Whether this install still needs first-run setup. Queried at boot by the route
 * guards to decide between the wizard, login, and the app. It flips at most once
 * (the moment setup completes), so it never goes stale on its own.
 */
export function useSetupStatus() {
  return useQuery({
    queryKey: queryKeys.setupStatus,
    queryFn: setupApi.status,
    staleTime: Infinity,
    retry: false,
  })
}

/**
 * Run first-run setup. On success we sign the new superuser in, seed `me`, and
 * flip the cached setup status to done — so the guards let the user straight
 * into the app with no extra requests.
 */
export function useCompleteSetup() {
  const queryClient = useQueryClient()
  const signIn = useAuthStore((s) => s.signIn)

  return useMutation({
    mutationFn: async (input: SetupInput) => {
      try {
        return await setupApi.complete(input)
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw new Error('Setup has already been completed on this install.', { cause: err })
        }
        throw err
      }
    },
    onSuccess: (result) => {
      signIn(result.token)
      queryClient.setQueryData(queryKeys.me, result.user)
      queryClient.setQueryData<SetupStatus>(queryKeys.setupStatus, { needs_setup: false })
    },
  })
}
