import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Segment } from '@/types/segment'

export interface SegmentListProps {
  /** Resolved segments. Never undefined — the container waits for the data. */
  segments: Segment[]
}

/** Presentational. Lists a project's segments (reusable targeting groups). */
export function SegmentList({ segments }: SegmentListProps) {
  if (segments.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No segments yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Members</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {segments.map((segment) => (
          <TableRow key={segment.id}>
            <TableCell>
              <span className="font-medium">{segment.name || segment.key}</span>
              {segment.description ? (
                <p className="text-muted-foreground text-sm">{segment.description}</p>
              ) : null}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{segment.key}</TableCell>
            <TableCell className="text-right tabular-nums">
              {segment.included.length} included · {segment.rules.length} rule
              {segment.rules.length === 1 ? '' : 's'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
