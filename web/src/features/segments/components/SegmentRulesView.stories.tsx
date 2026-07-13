import type { Meta, StoryObj } from '@storybook/react-vite'

import { SegmentRulesView } from '@/features/segments/components/SegmentRulesView'
import type { SegmentRule } from '@/types/segment'

const rules: SegmentRule[] = [
  { clauses: [{ contextKind: 'user', attribute: 'plan', op: 'in', values: ['pro', 'enterprise'] }] },
  {
    clauses: [
      { contextKind: 'user', attribute: 'country', op: 'in', values: ['US'] },
      { contextKind: 'user', attribute: 'beta', op: 'in', values: [true] },
    ],
  },
]

const meta = {
  title: 'Segments/SegmentRulesView',
  component: SegmentRulesView,
} satisfies Meta<typeof SegmentRulesView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { rules } }
export const Empty: Story = { args: { rules: [] } }
