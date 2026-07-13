import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Environment } from '@/types/environment'

export interface EnvironmentListProps {
  /** Resolved environments. Never undefined — the container waits for the data. */
  environments: Environment[]
}

/** Presentational. Lists a project's environments. */
export function EnvironmentList({ environments }: EnvironmentListProps) {
  if (environments.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No environments yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {environments.map((env) => (
          <TableRow key={env.id}>
            <TableCell className="font-medium">{env.name}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{env.key}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
