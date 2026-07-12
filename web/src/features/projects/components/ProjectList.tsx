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
}

/** Presentational. Renders the project table; opening a row is the container's call. */
export function ProjectList({ projects, onOpen }: ProjectListProps) {
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
