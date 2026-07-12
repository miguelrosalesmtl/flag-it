import { createBrowserRouter } from 'react-router'

import { LoginRoute, ProtectedLayout, SetupRoute } from '@/app/guards'
import { TenantsPage } from '@/features/tenants/TenantsPage'

export const router = createBrowserRouter([
  { path: '/setup', Component: SetupRoute },
  { path: '/login', Component: LoginRoute },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [{ index: true, Component: TenantsPage }],
  },
])
