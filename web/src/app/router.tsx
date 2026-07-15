import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/app/AppLayout'
import { ProjectLayout } from '@/app/ProjectLayout'
import { SettingsLayout } from '@/app/SettingsLayout'
import { LoginRoute, ProtectedLayout, SetupRoute } from '@/app/guards'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { ApprovalsPage } from '@/features/approvals/ApprovalsPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { ContextDetailPage } from '@/features/contexts/ContextDetailPage'
import { ContextsPage } from '@/features/contexts/ContextsPage'
import { EnvironmentsPage } from '@/features/environments/EnvironmentsPage'
import { FlagDetailPage } from '@/features/flags/FlagDetailPage'
import { FlagsPage } from '@/features/flags/FlagsPage'
import { LifecyclePage } from '@/features/flags/LifecyclePage'
import { MembersSettingsPage } from '@/features/members/MembersSettingsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ProjectsSettingsPage } from '@/features/projects/ProjectsSettingsPage'
import { RolesSettingsPage } from '@/features/roles/RolesSettingsPage'
import { SdkKeysPage } from '@/features/sdk-keys/SdkKeysPage'
import { SegmentDetailPage } from '@/features/segments/SegmentDetailPage'
import { SegmentsPage } from '@/features/segments/SegmentsPage'
import { WebhooksSettingsPage } from '@/features/webhooks/WebhooksSettingsPage'
import { GeneralSettingsPage } from '@/features/settings/GeneralSettingsPage'
import { SettingsPlaceholder } from '@/features/settings/SettingsPlaceholder'
import { OrganizationsPage } from '@/features/organizations/OrganizationsPage'
import { UsersPage } from '@/features/users/UsersPage'

export const router = createBrowserRouter([
  { path: '/setup', Component: SetupRoute },
  { path: '/login', Component: LoginRoute },
  {
    path: '/',
    Component: ProtectedLayout,
    children: [
      // Org shell: a top header. Organization + project selection.
      {
        Component: AppLayout,
        children: [
          { index: true, Component: OrganizationsPage },
          { path: 'users', Component: UsersPage },
          { path: 'organizations/:organizationSlug', Component: ProjectsPage },
        ],
      },
      {
        path: 'organizations/:organizationSlug/projects/:projectKey',
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
              { path: 'approvals', Component: ApprovalsPage },
              { path: 'lifecycle', Component: LifecyclePage },
              { path: 'audit', Component: AuditPage },
              { path: 'analytics', Component: AnalyticsPage },
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
              { path: 'projects', Component: ProjectsSettingsPage },
              { path: 'diagnostic-usage', Component: SettingsPlaceholder },
              { path: 'sdks', Component: SettingsPlaceholder },
              { path: 'members', Component: MembersSettingsPage },
              { path: 'teams', Component: SettingsPlaceholder },
              { path: 'roles', Component: RolesSettingsPage },
              { path: 'integrations', Component: WebhooksSettingsPage },
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
