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
  /** Emitted with a flag's key when its row is opened (to its detail/config view). */
  onOpen?: (key: string) => void
}

/**
 * Presentational. Lists a project's flag definitions; opening a row is the
 * container's call. Per-environment on/off and targeting live in the detail view.
 */
export function FlagList({ flags, onOpen }: FlagListProps) {
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
