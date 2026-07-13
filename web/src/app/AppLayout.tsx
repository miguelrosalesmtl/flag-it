import { Outlet } from 'react-router'

import { EnvironmentBanner } from '@/components/environment-banner'
import { Button } from '@/components/ui/button'
import { getConfig } from '@/config/env'
import { useLogout, useMe } from '@/features/auth/hooks/useAuth'

export function AppLayout() {
  // The composition root reads config; everything below it just receives props.
  const { environment, enableMocking } = getConfig()
  const { data: user } = useMe()
  const logout = useLogout()

  return (
    <div className="min-h-screen">
      <EnvironmentBanner environment={environment} mocking={enableMocking} />
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight">flag-it</span>
          <div className="flex items-center gap-3">
            {user ? <span className="text-muted-foreground text-sm">{user.email}</span> : null}
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}
