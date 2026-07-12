import { Navigate } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { Spinner } from '@/components/ui/spinner'
import { LoginPage } from '@/features/auth/LoginPage'
import { SetupPage } from '@/features/setup/SetupPage'
import { useSetupStatus } from '@/features/setup/hooks/useSetup'
import { useAuthStore } from '@/store/auth.store'

/**
 * The boot gate.
 *
 * Every entry point first asks the backend one question — does this install
 * still need setup? — and routes on the answer plus whether we hold a session:
 *
 *   fresh install        -> /setup   (the wizard; nothing else is reachable)
 *   configured, no token -> /login
 *   configured, signed in -> the app
 *
 * All three guards read the same cached `useSetupStatus` query, so it is one
 * request shared across them.
 */
function BootSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

export function SetupRoute() {
  const status = useSetupStatus()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (status.isPending) return <BootSpinner />
  if (!status.data?.needs_setup) return <Navigate to={isAuthenticated ? '/' : '/login'} replace />
  return <SetupPage />
}

export function LoginRoute() {
  const status = useSetupStatus()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (status.isPending) return <BootSpinner />
  if (status.data?.needs_setup) return <Navigate to="/setup" replace />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <LoginPage />
}

export function ProtectedLayout() {
  const status = useSetupStatus()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (status.isPending) return <BootSpinner />
  if (status.data?.needs_setup) return <Navigate to="/setup" replace />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AppLayout />
}
