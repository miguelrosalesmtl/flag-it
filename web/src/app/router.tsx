import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { ProjectLayout } from '@/app/ProjectLayout'
import { SettingsLayout } from '@/app/SettingsLayout'
import { LoginRoute, ProtectedLayout, SetupRoute } from '@/app/guards'
import { ContextDetailPage } from '@/features/contexts/ContextDetailPage'
import { ContextsPage } from '@/features/contexts/ContextsPage'
import { EnvironmentsPage } from '@/features/environments/EnvironmentsPage'
import { FlagDetailPage } from '@/features/flags/FlagDetailPage'
import { FlagsPage } from '@/features/flags/FlagsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { SdkKeysPage } from '@/features/sdk-keys/SdkKeysPage'
import { SegmentDetailPage } from '@/features/segments/SegmentDetailPage'
import { SegmentsPage } from '@/features/segments/SegmentsPage'
import { GeneralSettingsPage } from '@/features/settings/GeneralSettingsPage'
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder'
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
      {
        path: 'tenants/:tenantSlug/projects/:projectKey',
        children: [
          // Project shell: a left sidebar (project switcher + Features nav).
          {
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
          // Settings shell: its own sidebar (org/project settings), via the gear.
          {
            path: 'settings',
            Component: SettingsLayout,
            children: [
              { index: true, Component: GeneralSettingsPage },
              { path: 'general', Component: GeneralSettingsPage },
              { path: 'sdk-keys', Component: SdkKeysPage },
              { path: 'projects', Component: SettingsPlaceholder },
              { path: 'diagnostic-usage', Component: SettingsPlaceholder },
              { path: 'sdks', Component: SettingsPlaceholder },
              { path: 'members', Component: SettingsPlaceholder },
              { path: 'teams', Component: SettingsPlaceholder },
              { path: 'roles', Component: SettingsPlaceholder },
              { path: 'integrations', Component: SettingsPlaceholder },
              { path: 'applications', Component: SettingsPlaceholder },
              { path: 'relay-proxy', Component: SettingsPlaceholder },
              { path: 'authorization', Component: SettingsPlaceholder },
              { path: 'security', Component: SettingsPlaceholder },
            ],
          },
        ],
      },
    ],
  },
])
