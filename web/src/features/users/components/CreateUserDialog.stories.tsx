import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { CreateUserDialog } from '@/features/users/components/CreateUserDialog'

const meta = {
  title: 'Users/CreateUserDialog',
  component: CreateUserDialog,
  args: { onCreate: fn() },
} satisfies Meta<typeof CreateUserDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
