import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { FlagRules } from '@/features/flags/components/FlagRules'
import type { Flag, FlagRule } from '@/types/flag'

const flag: Flag = {
  id: 'f1', project_id: 'p1', key: 'promo', name: 'Promo', description: '',
  client_side_available: true, variations: [true, false],
  created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z',
}

const rules: FlagRule[] = [
  {
    id: 'rule-1',
    clauses: [{ contextKind: 'user', attribute: 'country', op: 'in', values: ['US', 'CA'], negate: false }],
    variation: 0,
  },
]

const meta = {
  title: 'Flags/FlagRules',
  component: FlagRules,
  args: { flag, rules, onAddRule: fn(), onRemoveRule: fn() },
} satisfies Meta<typeof FlagRules>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { rules: [] } }
