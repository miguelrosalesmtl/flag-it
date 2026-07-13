import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { CreateEnvironmentDialog } from '@/features/environments/components/CreateEnvironmentDialog'

const meta = {
  title: 'Environments/CreateEnvironmentDialog',
  component: CreateEnvironmentDialog,
  args: { open: true, onOpenChange: fn(), onCreate: fn() },
} satisfies Meta<typeof CreateEnvironmentDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Creating: Story = {
  args: { isCreating: true },
}

export const SubmitEmitsKeyAndName: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Name'), 'QA')
    await expect(dialog.getByLabelText('Key')).toHaveValue('qa')
    await userEvent.click(dialog.getByRole('button', { name: 'Create environment' }))
    await expect(args.onCreate).toHaveBeenCalledWith({ key: 'qa', name: 'QA' })
  },
}
