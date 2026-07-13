import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Member } from '@/types/member'

export interface MemberListProps {
  /** Resolved members. Never undefined — the container waits for the data. */
  members: Member[]
}

/** Presentational. Lists a tenant's members and their role. */
export function MemberList({ members }: MemberListProps) {
  if (members.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No members yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => (
          <TableRow key={m.user_id}>
            <TableCell className="font-medium">{m.email}</TableCell>
            <TableCell className="text-muted-foreground">{m.full_name || '—'}</TableCell>
            <TableCell className="text-right">
              {m.role ? <Badge variant="secondary">{m.role}</Badge> : <span className="text-muted-foreground">—</span>}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
