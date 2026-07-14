import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { GrantProjectRoleDialog } from '@/features/members/components/GrantProjectRoleDialog'
import type { Role } from '@/types/role'

const roles: Role[] = [
  { id: 'r2', tenant_id: 't1', key: 'writer', name: 'Writer', description: '', scope: 'project', is_system: true, permissions: [], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
  { id: 'r3', tenant_id: 't1', key: 'reader', name: 'Reader', description: '', scope: 'project', is_system: true, permissions: [], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
]

const meta = {
  title: 'Members/GrantProjectRoleDialog',
  component: GrantProjectRoleDialog,
  args: { projectKey: 'checkout', roles, onGrant: fn() },
} satisfies Meta<typeof GrantProjectRoleDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
