import type { Meta, StoryObj } from '@storybook/react-vite'

import { FlagList } from '@/features/flags/components/FlagList'
import type { Flag } from '@/types/flag'

const flags: Flag[] = [
  {
    id: '1',
    project_id: 'p1',
    key: 'new-checkout',
    name: 'New checkout',
    description: 'Rolls out the redesigned checkout flow.',
    client_side_available: true,
    variations: [true, false],
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: '2',
    project_id: 'p1',
    key: 'pricing-tier',
    name: 'Pricing tier',
    description: '',
    client_side_available: false,
    variations: ['free', 'pro', 'enterprise'],
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Flags/FlagList',
  component: FlagList,
} satisfies Meta<typeof FlagList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { flags },
}

export const Empty: Story = {
  args: { flags: [] },
}
