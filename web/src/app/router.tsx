import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { ProjectLayout } from '@/app/ProjectLayout'
import { LoginRoute, ProtectedLayout, SetupRoute } from '@/app/guards'
import { FlagDetailPage } from '@/features/flags/FlagDetailPage'
import { FlagsPage } from '@/features/flags/FlagsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { SegmentsPage } from '@/features/segments/SegmentsPage'
import { TenantsPage } from '@/features/tenants/TenantsPage'

export const router = createBrowserRouter([
  { path: '/setup', Component: SetupRoute },
  { path: '/login', Component: LoginRoute },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      // Org shell: a top header. Tenant + project selection.
      {
        Component: AppLayout,
        children: [
          { index: true, Component: TenantsPage },
          { path: 'tenants/:tenantSlug', Component: ProjectsPage },
        ],
      },
      // Project shell: a left sidebar (project switcher + Features nav).
      {
        path: 'tenants/:tenantSlug/projects/:projectKey',
        Component: ProjectLayout,
        children: [
          { index: true, Component: FlagsPage },
          { path: 'flags/:flagKey', Component: FlagDetailPage },
          { path: 'segments', Component: SegmentsPage },
        ],
      },
    ],
  },
])
