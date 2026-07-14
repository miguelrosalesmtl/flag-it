import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Project } from '@/types/project'

export interface ProjectSwitcherProps {
  /** Projects in the current organization. */
  projects: Project[]
  /** Key of the project currently open. */
  currentKey: string
  /** Emitted with a project key when one is chosen. */
  onSelect: (key: string) => void
}

/** Presentational. A dropdown to switch between the organization's projects. */
export function ProjectSwitcher({ projects, currentKey, onSelect }: ProjectSwitcherProps) {
  const current = projects.find((p) => p.key === currentKey)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">{current?.name ?? currentKey}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => onSelect(project.key)}>
            <span className="truncate">{project.name}</span>
            {project.key === currentKey ? <CheckIcon className="ml-auto size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
