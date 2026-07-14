import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Project } from '@/types/project'

export interface ProjectListProps {
  /** Resolved projects. Never undefined — the container waits for the data. */
  projects: Project[]
  /** Emitted with a project's key when its row is opened (to view its flags). */
  onOpen?: (key: string) => void
  /** Emitted with a project's key to delete it (renders a guarded action). */
  onDelete?: (key: string) => void
  busy?: boolean
}

/** Presentational. Renders the project table; opening a row is the container's call. */
export function ProjectList({ projects, onOpen, onDelete, busy }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No projects yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          {onDelete ? <TableHead className="w-0" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="font-medium">
              {onOpen ? (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={() => onOpen(project.key)}
                >
                  {project.name}
                </button>
              ) : (
                project.name
              )}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{project.key}</TableCell>
            {onDelete ? (
              <TableCell className="text-right">
                <ConfirmDeleteDialog
                  triggerLabel="Delete"
                  triggerVariant="ghost"
                  title={`Delete ${project.name}?`}
                  description="This removes the project and all its flags, segments, environments, and SDK keys. This cannot be undone."
                  confirmLabel="Delete project"
                  busy={busy}
                  onConfirm={() => onDelete(project.key)}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
