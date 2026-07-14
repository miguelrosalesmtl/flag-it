import type { Meta, StoryObj } from '@storybook/react-vite'

import { RoleList } from '@/features/roles/components/RoleList'
import type { Role } from '@/types/role'

const roles: Role[] = [
  { id: 'r1', organization_id: 't1', key: 'organization_admin', name: 'Organization Admin', description: '', scope: 'organization', is_system: true, permissions: ['*'], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
  { id: 'r2', organization_id: 't1', key: 'writer', name: 'Writer', description: '', scope: 'project', is_system: true, permissions: ['flag.read', 'flag.write'], created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z' },
]

const meta = { title: 'Roles/RoleList', component: RoleList } satisfies Meta<typeof RoleList>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: { roles } }
export const Empty: Story = { args: { roles: [] } }
