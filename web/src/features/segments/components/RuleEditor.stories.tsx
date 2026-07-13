import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { RuleEditor } from '@/features/segments/components/RuleEditor'
import type { SegmentRule } from '@/types/segment'

const rule: SegmentRule = {
  clauses: [
    { contextKind: 'user', attribute: 'plan', op: 'in', values: ['pro'], negate: false },
    { contextKind: 'user', attribute: 'country', op: 'in', values: ['US'], negate: false },
  ],
}

const meta = {
  title: 'Segments/RuleEditor',
  component: RuleEditor,
  args: { rule, index: 0, onChange: fn(), onRemove: fn() },
} satisfies Meta<typeof RuleEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
