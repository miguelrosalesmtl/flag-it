import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Project } from '@/types/project'

export interface ProjectGeneralFormProps {
  /** The loaded project. Mount keyed by updated_at so it re-seeds after a save. */
  project: Project
  /** Emitted with the new name on save. */
  onSave: (name: string) => void
  isSaving?: boolean
}

/**
 * Presentational (with local form state). Rename a project; the key is immutable.
 * Initialised from the project prop on mount — no effect needed.
 */
export function ProjectGeneralForm({ project, onSave, isSaving }: ProjectGeneralFormProps) {
  const [name, setName] = useState(project.name)

  return (
    <div className="max-w-md space-y-4 rounded-xl border p-4">
      <div className="space-y-2">
        <Label htmlFor="project-key">Key</Label>
        <Input id="project-key" value={project.key} disabled className="font-mono" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-name">Name</Label>
        <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onSave(name.trim())}
          disabled={!name.trim() || name.trim() === project.name || isSaving}
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
