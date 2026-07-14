import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { OrganizationList } from '@/features/organizations/components/OrganizationList'
import type { Organization } from '@/types/organization'

const organizations: Organization[] = [
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
  title: 'Organizations/OrganizationList',
  component: OrganizationList,
  args: { onOpen: fn() },
} satisfies Meta<typeof OrganizationList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { organizations },
}

export const Empty: Story = {
  args: { organizations: [] },
}
