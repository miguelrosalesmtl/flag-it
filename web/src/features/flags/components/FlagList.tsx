import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Flag } from '@/types/flag'

export interface FlagListProps {
  /** Resolved flag definitions. Never undefined — the container waits for the data. */
  flags: Flag[]
}

/**
 * Presentational. Lists a project's flag definitions. Per-environment on/off and
 * targeting live in a separate view — this is the catalog, not the switchboard.
 */
export function FlagList({ flags }: FlagListProps) {
  if (flags.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No flags yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Variations</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((flag) => (
          <TableRow key={flag.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium">{flag.name || flag.key}</span>
                {flag.client_side_available ? (
                  <Badge variant="secondary">Client-side</Badge>
                ) : null}
              </div>
              {flag.description ? (
                <p className="text-muted-foreground text-sm">{flag.description}</p>
              ) : null}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{flag.key}</TableCell>
            <TableCell className="text-right tabular-nums">{flag.variations.length}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
