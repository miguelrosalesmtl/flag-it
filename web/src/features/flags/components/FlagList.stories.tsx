import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { FlagList } from '@/features/flags/components/FlagList'
import type { FlagWithState } from '@/types/flag'

const flags: FlagWithState[] = [
  {
    id: 'f1',
    project_id: 'p1',
    key: 'new-checkout',
    name: 'New checkout',
    description: 'Rolls out the redesigned checkout flow.',
    client_side_available: true,
    temporary: false,
    variations: [true, false],
    on: true,
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'f2',
    project_id: 'p1',
    key: 'pricing-tier',
    name: 'Pricing tier',
    description: '',
    client_side_available: false,
    temporary: false,
    variations: ['free', 'pro', 'enterprise'],
    on: false,
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Flags/FlagList',
  component: FlagList,
  args: { onOpen: fn(), onToggle: fn() },
} satisfies Meta<typeof FlagList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { flags },
}

export const Empty: Story = {
  args: { flags: [] },
}

export const FlippingASwitchEmitsKeyAndState: Story = {
  args: { flags },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    // 'pricing-tier' is off; turning it on emits (key, true).
    await userEvent.click(canvas.getByRole('switch', { name: 'Toggle Pricing tier' }))
    await expect(args.onToggle).toHaveBeenCalledWith('pricing-tier', true)
  },
}
