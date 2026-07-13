import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ContextEvaluation } from '@/types/context'

export interface ExpectedVariationsTableProps {
  /** How each flag evaluates for the context. */
  evaluations: ContextEvaluation[]
}

function display(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

/** Presentational. How every flag serves this context — the "expected variations" view. */
export function ExpectedVariationsTable({ evaluations }: ExpectedVariationsTableProps) {
  if (evaluations.length === 0) {
    return <p className="text-muted-foreground text-sm">No flags to evaluate.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Flag</TableHead>
          <TableHead>Value</TableHead>
          <TableHead className="text-right">Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {evaluations.map((e) => (
          <TableRow key={e.flag_key}>
            <TableCell className="font-mono text-sm">{e.flag_key}</TableCell>
            <TableCell className="font-mono text-sm">{display(e.value)}</TableCell>
            <TableCell className="text-muted-foreground text-right text-xs">{e.reason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
