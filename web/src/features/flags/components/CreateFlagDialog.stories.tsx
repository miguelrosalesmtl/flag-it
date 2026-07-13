import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { CreateFlagDialog } from '@/features/flags/components/CreateFlagDialog'

const meta = {
  title: 'Flags/CreateFlagDialog',
  component: CreateFlagDialog,
  args: { open: true, onOpenChange: fn(), onCreate: fn() },
} satisfies Meta<typeof CreateFlagDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Creating: Story = {
  args: { isCreating: true },
}

export const WithError: Story = {
  args: { errorMessage: 'Could not create flag — the key may already be taken.' },
}

/** A boolean flag: key auto-derives, and submit emits [true, false]. Portal-rendered. */
export const CreateBooleanFlag: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Name'), 'Dark mode')
    await expect(dialog.getByLabelText('Key')).toHaveValue('dark-mode')
    await userEvent.click(dialog.getByRole('button', { name: 'Create flag' }))
    await expect(args.onCreate).toHaveBeenCalledWith({
      key: 'dark-mode',
      name: 'Dark mode',
      variations: [true, false],
    })
  },
}
