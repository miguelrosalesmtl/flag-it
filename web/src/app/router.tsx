import { createBrowserRouter } from 'react-router'

import { LoginRoute, ProtectedLayout, SetupRoute } from '@/app/guards'
import { FlagsPage } from '@/features/flags/FlagsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { TenantsPage } from '@/features/tenants/TenantsPage'

export const router = createBrowserRouter([
  { path: '/setup', Component: SetupRoute },
  { path: '/login', Component: LoginRoute },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      { index: true, Component: TenantsPage },
      { path: 'tenants/:tenantSlug', Component: ProjectsPage },
      { path: 'tenants/:tenantSlug/projects/:projectKey', Component: FlagsPage },
    ],
  },
])
