import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { CreateSdkKeyDialog } from '@/features/sdk-keys/components/CreateSdkKeyDialog'

const meta = {
  title: 'SDKKeys/CreateSdkKeyDialog',
  component: CreateSdkKeyDialog,
  args: { open: true, onOpenChange: fn(), onCreate: fn() },
} satisfies Meta<typeof CreateSdkKeyDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CreatingAServerKey: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Name'), 'CI')
    await userEvent.click(dialog.getByRole('button', { name: 'Create key' }))
    await expect(args.onCreate).toHaveBeenCalledWith({ kind: 'server', name: 'CI' })
  },
}
