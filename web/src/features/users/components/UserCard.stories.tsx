import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { UserCard } from '@/features/users/components/UserCard'

/**
 * A single user. Edit the `user` object in the Controls panel and watch it
 * re-render — that is the whole contract. It has no idea whether this user came
 * from the network, a cache, or this text box.
 */
const meta = {
  title: 'Users/UserCard',
  component: UserCard,
  args: {
    user: { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
    onDelete: fn(),
    isDeleting: false,
  },
} satisfies Meta<typeof UserCard>

export default meta
type Story = StoryObj<typeof meta>

export const Admin: Story = {}

export const Member: Story = {
  args: {
    user: { id: '2', name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
  },
}

/** Mid-delete: the button is disabled so it cannot be fired twice. */
export const Deleting: Story = {
  args: { isDeleting: true },
}

/** No `onDelete` handler — the delete button is not rendered at all. */
export const ReadOnly: Story = {
  args: { onDelete: undefined },
}

/** Long values should not blow out the layout. */
export const LongName: Story = {
  args: {
    user: {
      id: '3',
      name: 'Grace Brewster Murray Hopper, Rear Admiral',
      email: 'grace.brewster.murray.hopper@a-very-long-domain.example.com',
      role: 'admin',
    },
  },
}
