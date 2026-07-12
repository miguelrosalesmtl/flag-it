import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Tenant } from '@/types/tenant'

export interface TenantListProps {
  /** Resolved tenants. Never undefined — the container waits for the data. */
  tenants: Tenant[]
}

/** Presentational. Renders the tenant table; no data access, no branching on load/error. */
export function TenantList({ tenants }: TenantListProps) {
  if (tenants.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No tenants yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell className="font-medium">{tenant.name}</TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{tenant.slug}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
