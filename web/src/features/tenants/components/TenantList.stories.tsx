import type { Meta, StoryObj } from '@storybook/react-vite'

import { TenantList } from '@/features/tenants/components/TenantList'
import type { Tenant } from '@/types/tenant'

const tenants: Tenant[] = [
  {
    id: '1',
    slug: 'acme',
    name: 'Acme Inc',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: '2',
    slug: 'globex',
    name: 'Globex Corporation',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Tenants/TenantList',
  component: TenantList,
} satisfies Meta<typeof TenantList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { tenants },
}

export const Empty: Story = {
  args: { tenants: [] },
}
