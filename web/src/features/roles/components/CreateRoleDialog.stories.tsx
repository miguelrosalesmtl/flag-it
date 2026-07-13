import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { CreateRoleDialog } from '@/features/roles/components/CreateRoleDialog'

const permissions = ['flag.read', 'flag.write', 'flag.delete', 'project.read', 'project.update']

const meta = {
  title: 'Roles/CreateRoleDialog',
  component: CreateRoleDialog,
  args: { open: true, onOpenChange: fn(), onCreate: fn(), permissions },
} satisfies Meta<typeof CreateRoleDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const PickingPermissionsAndSubmitting: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Name'), 'QA')
    await expect(dialog.getByLabelText('Key')).toHaveValue('qa')
    // Check two flag permissions, then submit.
    const boxes = dialog.getAllByRole('checkbox')
    await userEvent.click(boxes[0]!)
    await userEvent.click(boxes[1]!)
    await userEvent.click(dialog.getByRole('button', { name: 'Create role' }))
    await expect(args.onCreate).toHaveBeenCalledWith({
      key: 'qa',
      name: 'QA',
      description: '',
      scope: 'project',
      permissions: ['flag.read', 'flag.write'],
    })
  },
}
