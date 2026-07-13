import {
  BoxIcon,
  CheckCheckIcon,
  FlagIcon,
  HeartPulseIcon,
  LayersIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'

import { EnvironmentBanner } from '@/components/environment-banner'
import { getConfig } from '@/config/env'
import { UserMenu } from '@/features/auth/components/UserMenu'
import { useLogout, useMe } from '@/features/auth/hooks/useAuth'
import { ProjectSwitcher } from '@/features/projects/components/ProjectSwitcher'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { cn } from '@/lib/utils'

function NavItem({ to, end, icon: Icon, label }: { to: string; end?: boolean; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50',
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  )
}

/**
 * The project shell. A left sidebar (project switcher + Features nav) around the
 * project's screens. Rendered for all /tenants/:t/projects/:p routes.
 */
export function ProjectLayout() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const projects = useProjects(tenantSlug)
  const { data: user } = useMe()
  const logout = useLogout()
  const { environment, enableMocking } = getConfig()

  const base = `/tenants/${tenantSlug}/projects/${projectKey}`

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r">
        <div className="space-y-2 border-b p-3">
          <Link to="/" className="block text-sm font-semibold tracking-tight">
            flag-it
          </Link>
          <ProjectSwitcher
            projects={projects.data ?? []}
            currentKey={projectKey}
            onSelect={(key) => void navigate(`/tenants/${tenantSlug}/projects/${key}`)}
          />
        </div>

        <nav className="flex-1 space-y-1 p-2">
          <p className="text-muted-foreground px-2 py-1 text-xs font-medium uppercase">Features</p>
          <NavItem to={base} end icon={FlagIcon} label="Flags" />
          <NavItem to={`${base}/segments`} icon={UsersIcon} label="Segments" />
          <NavItem to={`${base}/contexts`} icon={BoxIcon} label="Contexts" />
          <NavItem to={`${base}/approvals`} icon={CheckCheckIcon} label="Approvals" />
          <NavItem to={`${base}/lifecycle`} icon={HeartPulseIcon} label="Lifecycle" />
          <p className="text-muted-foreground px-2 pt-3 pb-1 text-xs font-medium uppercase">
            Project settings
          </p>
          <NavItem to={`${base}/environments`} icon={LayersIcon} label="Environments" />
        </nav>

        <div className="flex items-center justify-between border-t p-3">
          <UserMenu user={user} onSignOut={logout} />
          <Link
            to={`${base}/settings/general`}
            aria-label="Settings"
            className="text-muted-foreground hover:text-foreground"
          >
            <SettingsIcon className="size-5" />
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <EnvironmentBanner environment={environment} mocking={enableMocking} />
        <main className="mx-auto max-w-5xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
