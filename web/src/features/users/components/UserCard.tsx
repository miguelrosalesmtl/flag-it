import { Trash2Icon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/types/user'

export interface UserCardProps {
  /** The user to render. */
  user: User
  /** Emitted with the user's id when delete is clicked. Omit it and no delete button renders. */
  onDelete?: (id: string) => void
  /** Disables the delete button while a deletion is in flight. */
  isDeleting?: boolean
}

/**
 * Presentational. Props in, callbacks out.
 *
 * It does not know where `user` came from, whether it is cached, or what
 * happens when you click delete. That is the container's problem — which is
 * exactly why this renders in Storybook with no provider and no network.
 */
export function UserCard({ user, onDelete, isDeleting = false }: UserCardProps) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </div>
        {onDelete ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${user.name}`}
            disabled={isDeleting}
            onClick={() => onDelete(user.id)}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge>
      </CardContent>
    </Card>
  )
}
