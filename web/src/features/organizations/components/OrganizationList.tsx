import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Organization } from '@/types/organization'

export interface OrganizationListProps {
  /** Resolved organizations. Never undefined — the container waits for the data. */
  organizations: Organization[]
  /** Emitted with a organization's slug when its row is opened. Navigation is the container's job. */
  onOpen?: (slug: string) => void
  /** Emitted with a organization's slug to delete it (renders a guarded action). */
  onDelete?: (slug: string) => void
  busy?: boolean
}

/** Presentational. Renders the organization table; no data access, no branching on load/error. */
export function OrganizationList({ organizations, onOpen, onDelete, busy }: OrganizationListProps) {
  if (organizations.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No organizations yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slug</TableHead>
          {onDelete ? <TableHead className="w-0" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((organization) => (
          <TableRow key={organization.id}>
            <TableCell className="font-medium">
              {onOpen ? (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => onOpen(organization.slug)}
                >
                  {organization.name}
                </button>
              ) : (
                organization.name
              )}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{organization.slug}</TableCell>
            {onDelete ? (
              <TableCell className="text-right">
                <ConfirmDeleteDialog
                  triggerLabel="Delete"
                  triggerVariant="ghost"
                  title={`Delete ${organization.name}?`}
                  description="This permanently removes the organization and everything in it — projects, flags, segments, members, and keys. This cannot be undone."
                  confirmLabel="Delete organization"
                  busy={busy}
                  onConfirm={() => onDelete(organization.slug)}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
