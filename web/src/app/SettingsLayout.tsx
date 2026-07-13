import { ArrowLeftIcon } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router'

import { EnvironmentBanner } from '@/components/environment-banner'
import { getConfig } from '@/config/env'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { useLogout, useMe } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

function SettingsNavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'block rounded-md px-2 py-1.5 text-sm',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50',
        )
      }
    >
      {label}
    </NavLink>
  )
}

function Section({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground/80 mt-4 border-t px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wider uppercase">
      {label}
    </p>
  )
}

/** The settings shell — its own left sidebar (org/project settings), reached via the gear. */
export function SettingsLayout() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const { data: user } = useMe()
  const logout = useLogout()
  const { environment, enableMocking } = getConfig()

  const base = `/tenants/${tenantSlug}/projects/${projectKey}/settings`

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col border-r">
        <div className="border-b p-3">
          <Link
            to={`/tenants/${tenantSlug}/projects/${projectKey}`}
            className="text-muted-foreground flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeftIcon className="size-4" /> Back to project
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <SettingsNavItem to={`${base}/general`} label="General" />
          <SettingsNavItem to={`${base}/projects`} label="Projects" />

          <Section label="Plans and usage" />
          <SettingsNavItem to={`${base}/diagnostic-usage`} label="Diagnostic usage" />
          <SettingsNavItem to={`${base}/sdks`} label="SDKs" />

          <Section label="Access" />
          <SettingsNavItem to={`${base}/members`} label="Members" />
          <SettingsNavItem to={`${base}/teams`} label="Teams" />
          <SettingsNavItem to={`${base}/roles`} label="Roles" />

          <Section label="Connections" />
          <SettingsNavItem to={`${base}/integrations`} label="Integrations" />

          <Section label="Configuration" />
          <SettingsNavItem to={`${base}/applications`} label="Applications" />
          <SettingsNavItem to={`${base}/relay-proxy`} label="Relay Proxy" />

          <Section label="Security" />
          <SettingsNavItem to={`${base}/authorization`} label="Authorization" />
          <SettingsNavItem to={`${base}/security`} label="Security" />
          <SettingsNavItem to={`${base}/sdk-keys`} label="SDK keys" />
        </nav>

        <div className="flex items-center border-t p-3">
          <UserMenu user={user} onSignOut={logout} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <EnvironmentBanner environment={environment} mocking={enableMocking} />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
