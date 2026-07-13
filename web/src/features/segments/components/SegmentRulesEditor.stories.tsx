import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { SegmentRulesEditor } from '@/features/segments/components/SegmentRulesEditor'
import type { SegmentRule } from '@/types/segment'

const rules: SegmentRule[] = [
  { clauses: [{ contextKind: 'user', attribute: 'plan', op: 'in', values: ['pro'], negate: false }] },
]

const meta = {
  title: 'Segments/SegmentRulesEditor',
  component: SegmentRulesEditor,
  args: { rules, onChange: fn() },
} satisfies Meta<typeof SegmentRulesEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { rules: [] } }

export const AddingARuleEmits: Story = {
  args: { rules: [] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Add rule' }))
    await expect(args.onChange).toHaveBeenCalled()
  },
}
