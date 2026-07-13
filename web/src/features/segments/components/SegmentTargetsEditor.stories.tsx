import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { SegmentTargetsEditor } from '@/features/segments/components/SegmentTargetsEditor'

const meta = {
  title: 'Segments/SegmentTargetsEditor',
  component: SegmentTargetsEditor,
  args: { label: 'Included', values: ['user-1', 'user-2'], onChange: fn() },
} satisfies Meta<typeof SegmentTargetsEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { values: [] },
}

export const AddingAKeyEmitsTheNextList: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByPlaceholderText('Add a context key'), 'user-3')
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }))
    await expect(args.onChange).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3'])
  },
}
