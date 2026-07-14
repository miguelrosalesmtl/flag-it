import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { AddMemberDialog } from '@/features/members/components/AddMemberDialog'
import type { Role } from '@/types/role'

const roles: Role[] = [
  { id: 'r1', organization_id: 't1', key: 'organization_admin', name: 'Organization Admin', description: '', scope: 'organization', is_system: true, permissions: [], created_at: '', updated_at: '' },
]

const meta = {
  title: 'Members/AddMemberDialog',
  component: AddMemberDialog,
  args: { open: true, onOpenChange: fn(), onAdd: fn(), roles },
} satisfies Meta<typeof AddMemberDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const SubmitEmitsEmail: Story = {
  play: async ({ args }) => {
    const dialog = within(document.body)
    await userEvent.type(dialog.getByLabelText('Email'), 'dev@flag-it.dev')
    await userEvent.click(dialog.getByRole('button', { name: 'Add member' }))
    await expect(args.onAdd).toHaveBeenCalledWith({ email: 'dev@flag-it.dev', role: undefined })
  },
}
