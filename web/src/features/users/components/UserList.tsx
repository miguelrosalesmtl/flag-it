import { Badge } from '@/components/ui/badge'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { User } from '@/types/user'

export interface UserListProps {
  /** Resolved users. Never undefined — the container waits for the data. */
  users: User[]
  /** Emitted with a user's id to delete them (renders a guarded action). */
  onDelete?: (id: string) => void
  busy?: boolean
}

/** Presentational. The platform user table with a guarded delete per row. */
export function UserList({ users, onDelete, busy }: UserListProps) {
  if (users.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No users yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          {onDelete ? <TableHead className="w-0" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">
              {user.email}
              {user.is_superuser ? (
                <Badge variant="secondary" className="ml-2">
                  Superuser
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="text-muted-foreground">{user.full_name || '—'}</TableCell>
            <TableCell>
              <Badge variant={user.is_active ? 'default' : 'destructive'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            {onDelete ? (
              <TableCell className="text-right">
                <ConfirmDeleteDialog
                  triggerLabel="Delete"
                  triggerVariant="ghost"
                  title={`Delete ${user.email}?`}
                  description="This permanently removes the user account. This cannot be undone."
                  confirmLabel="Delete user"
                  busy={busy}
                  onConfirm={() => onDelete(user.id)}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
