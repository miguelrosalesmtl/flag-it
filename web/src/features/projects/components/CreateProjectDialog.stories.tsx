import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'

const meta = {
  title: 'Projects/CreateProjectDialog',
  component: CreateProjectDialog,
  args: { open: true, onOpenChange: fn(), onCreate: fn() },
} satisfies Meta<typeof CreateProjectDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Creating: Story = {
  args: { isCreating: true },
}

export const WithError: Story = {
  args: { errorMessage: 'Could not create project — the key may already be taken.' },
}

/** The key auto-derives from the name, and submit emits both. Dialog renders in a portal. */
export const SubmitEmitsKeyAndName: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Name'), 'Mobile App')
    await expect(dialog.getByLabelText('Key')).toHaveValue('mobile-app')
    await userEvent.click(dialog.getByRole('button', { name: 'Create project' }))
    await expect(args.onCreate).toHaveBeenCalledWith({ key: 'mobile-app', name: 'Mobile App' })
  },
}
