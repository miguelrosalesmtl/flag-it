import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'

const meta = {
  title: 'Components/ConfirmDeleteDialog',
  component: ConfirmDeleteDialog,
  args: {
    triggerLabel: 'Delete flag',
    title: 'Delete new-checkout?',
    description: 'This removes the flag and its configuration in every environment. This cannot be undone.',
    confirmLabel: 'Delete flag',
    onConfirm: fn(),
  },
} satisfies Meta<typeof ConfirmDeleteDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const RowAction: Story = { args: { triggerLabel: 'Delete', triggerVariant: 'ghost' } }
