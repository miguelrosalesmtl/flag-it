import { Outlet } from 'react-router'

import { EnvironmentBanner } from '@/components/environment-banner'
import { getConfig } from '@/config/env'

export function AppLayout() {
  // The composition root reads config; everything below it just receives props.
  const { environment } = getConfig()

  return (
    <div className="min-h-screen">
      <EnvironmentBanner environment={environment} />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  )
}
