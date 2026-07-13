import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SeenContext } from '@/types/context'

export interface ContextListProps {
  /** Resolved contexts. Never undefined — the container waits for the data. */
  contexts: SeenContext[]
  /** Emitted with a context's kind + key when its row is opened. */
  onOpen?: (kind: string, key: string) => void
}

/** Presentational. Lists contexts seen during evaluation, most-recent first. */
export function ContextList({ contexts, onOpen }: ContextListProps) {
  if (contexts.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No contexts seen yet. They appear here after flags are evaluated.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kind</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Last seen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contexts.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <Badge variant="secondary">{c.kind}</Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">
              {onOpen ? (
                <button type="button" className="hover:underline" onClick={() => onOpen(c.kind, c.key)}>
                  {c.key}
                </button>
              ) : (
                c.key
              )}
            </TableCell>
            <TableCell className="text-muted-foreground text-right text-sm">
              {new Date(c.last_seen).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
