import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { UserList } from '@/features/users/components/UserList'
import type { User } from '@/types/user'

const users: User[] = [
  { id: '1', email: 'ada@example.com', full_name: 'Ada Lovelace', is_superuser: true, is_active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: '2', email: 'alan@example.com', full_name: 'Alan Turing', is_superuser: false, is_active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: '3', email: 'grace@example.com', full_name: '', is_superuser: false, is_active: false, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
]

const meta = {
  title: 'Users/UserList',
  component: UserList,
  args: { users, onDelete: fn() },
} satisfies Meta<typeof UserList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { users: [] } }
