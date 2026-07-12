import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { UserList } from '@/features/users/components/UserList'
import type { User } from '@/types/user'

const users: User[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: '2', name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
  { id: '3', name: 'Grace Hopper', email: 'grace@example.com', role: 'admin' },
]

/**
 * Zero setup: no QueryClient, no MSW, no router. A dumb component is just a
 * function of its props, so every state it can be in is a story.
 */
const meta = {
  title: 'Users/UserList',
  component: UserList,
  args: { onDelete: fn() },
} satisfies Meta<typeof UserList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { users },
}

export const Empty: Story = {
  args: { users: [] },
}

export const Deleting: Story = {
  args: { users, deletingId: '1' },
}

/** No `onDelete` handler — the delete buttons are not rendered at all. */
export const ReadOnly: Story = {
  args: { users, onDelete: undefined },
}

/**
 * The component's entire outward contract, exercised.
 *
 * Clicking delete does not delete anything — it calls `onDelete('1')` and stops.
 * Deciding what that *means* is the container's job. Watch the Interactions panel
 * run these assertions, and the Actions panel record the emitted callback.
 */
export const ClickingDeleteEmitsTheUserId: Story = {
  args: { users },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('click delete on Ada', async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Delete Ada Lovelace' }))
    })

    await step('the id is emitted, and nothing is removed', async () => {
      await expect(args.onDelete).toHaveBeenCalledWith('1')
      // Still on screen: a dumb component does not mutate its own props.
      await expect(canvas.getByText('Ada Lovelace')).toBeInTheDocument()
    })
  },
}
