import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { UserMenu } from '@/features/auth/components/UserMenu'

const meta = {
  title: 'Auth/UserMenu',
  component: UserMenu,
  args: { user: { email: 'admin@flag-it.dev', full_name: 'Miguel Rosales' }, onSignOut: fn() },
} satisfies Meta<typeof UserMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoName: Story = { args: { user: { email: 'admin@flag-it.dev', full_name: '' } } }
export const Loading: Story = { args: { user: undefined } }
