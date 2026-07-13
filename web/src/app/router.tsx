import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { ProjectLayout } from '@/app/ProjectLayout'
import { LoginRoute, ProtectedLayout, SetupRoute } from '@/app/guards'
import { ContextDetailPage } from '@/features/contexts/ContextDetailPage'
import { ContextsPage } from '@/features/contexts/ContextsPage'
import { EnvironmentsPage } from '@/features/environments/EnvironmentsPage'
import { FlagDetailPage } from '@/features/flags/FlagDetailPage'
import { FlagsPage } from '@/features/flags/FlagsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { SegmentDetailPage } from '@/features/segments/SegmentDetailPage'
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
          { path: 'segments/:segKey', Component: SegmentDetailPage },
          { path: 'contexts', Component: ContextsPage },
          { path: 'contexts/:kind/:key', Component: ContextDetailPage },
          { path: 'environments', Component: EnvironmentsPage },
        ],
      },
    ],
  },
])
