import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { StatsBars } from '@/features/analytics/components/StatsBars'

const rows = [
  { key: 'new-checkout', label: 'new-checkout', count: 10300 },
  { key: 'pricing-tier', label: 'pricing-tier', count: 4200 },
  { key: 'dark-mode', label: 'dark-mode', count: 900 },
]

const meta = {
  title: 'Analytics/StatsBars',
  component: StatsBars,
  args: { rows, total: rows.reduce((a, r) => a + r.count, 0) },
} satisfies Meta<typeof StatsBars>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Clickable: Story = { args: { onSelect: fn() } }
export const Empty: Story = { args: { rows: [], total: 0 } }
