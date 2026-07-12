import { UserCard } from '@/features/users/components/UserCard'
import type { User } from '@/types/user'

export interface UserListProps {
  /** Resolved users. Never undefined — the container waits for the data. */
  users: User[]
  /** Emitted with the user's id when delete is clicked. Nothing is removed here. */
  onDelete?: (id: string) => void
  /** Id of the user currently being deleted; disables that row's delete button. */
  deletingId?: string | null
}

/**
 * Presentational.
 *
 * Note what is NOT in the props: `isLoading` and `error`. The container branches
 * on those and only renders this once data has resolved, so `users` is always a
 * real array and there is no state machine to reason about in here.
 */
export function UserList({ users, onDelete, deletingId }: UserListProps) {
  if (users.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No users yet.
      </p>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((user) => (
        <li key={user.id}>
          <UserCard user={user} onDelete={onDelete} isDeleting={deletingId === user.id} />
        </li>
      ))}
    </ul>
  )
}
