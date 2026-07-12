import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { UserList } from '@/features/users/components/UserList'
import type { User } from '@/types/user'

const users: User[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: '2', name: 'Alan Turing', email: 'alan@example.com', role: 'member' },
]

describe('UserList', () => {
  // No providers, no MSW, no QueryClient. It is a function of its props.
  it('renders a card per user', () => {
    render(<UserList users={users} />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
  })

  it('renders an empty state when there are no users', () => {
    render(<UserList users={[]} />)

    expect(screen.getByText('No users yet.')).toBeInTheDocument()
  })

  it('emits onDelete with the user id', async () => {
    const onDelete = vi.fn()
    render(<UserList users={users} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete Ada Lovelace' }))

    expect(onDelete).toHaveBeenCalledExactlyOnceWith('1')
  })

  it('disables the delete button for the user being deleted', () => {
    render(<UserList users={users} onDelete={vi.fn()} deletingId="1" />)

    expect(screen.getByRole('button', { name: 'Delete Ada Lovelace' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Alan Turing' })).toBeEnabled()
  })
})
