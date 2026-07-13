import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FlagLifecycle, LifecycleStatus } from '@/types/flag'

const STATUS: Record<LifecycleStatus, { label: string; variant: 'secondary' | 'default' | 'destructive' }> = {
  new: { label: 'New', variant: 'secondary' },
  active: { label: 'Active', variant: 'default' },
  inactive: { label: 'Stale', variant: 'destructive' },
}

export interface FlagLifecycleListProps {
  /** Flags annotated with lifecycle status. */
  flags: FlagLifecycle[]
  /** Emitted with a flag's key when its row is opened. */
  onOpen?: (key: string) => void
}

/**
 * Presentational. Lists flags with a lifecycle status (New/Active/Stale), a
 * temporary marker, and when each was last evaluated — the stale-flag view.
 */
export function FlagLifecycleList({ flags, onOpen }: FlagLifecycleListProps) {
  if (flags.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No flags match this filter.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Last evaluated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((flag) => (
          <TableRow key={flag.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {onOpen ? (
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => onOpen(flag.key)}
                  >
                    {flag.name || flag.key}
                  </button>
                ) : (
                  <span className="font-medium">{flag.name || flag.key}</span>
                )}
                {flag.temporary ? <Badge variant="outline">Temporary</Badge> : null}
              </div>
              <p className="text-muted-foreground font-mono text-sm">{flag.key}</p>
            </TableCell>
            <TableCell>
              <Badge variant={STATUS[flag.status].variant}>{STATUS[flag.status].label}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-right text-sm">
              {flag.last_evaluated ? new Date(flag.last_evaluated).toLocaleDateString() : 'Never'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
