import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Role } from '@/types/role'

export interface RoleListProps {
  /** Resolved roles. Never undefined — the container waits for the data. */
  roles: Role[]
}

/** Presentational. Lists a organization's roles (permission bundles). */
export function RoleList({ roles }: RoleListProps) {
  if (roles.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No roles yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead className="text-right">Permissions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.name}</span>
                {role.is_system ? <Badge variant="outline">System</Badge> : null}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{role.key}</TableCell>
            <TableCell>
              <Badge variant="secondary">{role.scope}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{role.permissions.length}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
