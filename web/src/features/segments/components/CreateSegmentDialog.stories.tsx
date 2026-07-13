import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { CreateSegmentDialog } from '@/features/segments/components/CreateSegmentDialog'

const meta = {
  title: 'Segments/CreateSegmentDialog',
  component: CreateSegmentDialog,
  args: { open: true, onOpenChange: fn(), onCreate: fn() },
} satisfies Meta<typeof CreateSegmentDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SubmitEmitsKeyNameDescription: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Name'), 'Beta users')
    await expect(dialog.getByLabelText('Key')).toHaveValue('beta-users')
    await userEvent.click(dialog.getByRole('button', { name: 'Create segment' }))
    await expect(args.onCreate).toHaveBeenCalledWith({
      key: 'beta-users',
      name: 'Beta users',
      description: '',
    })
  },
}
