import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreateProjectInput } from '@/types/project'

export interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Emitted with the new project's key + name on submit. Creation is the container's job. */
  onCreate: (input: CreateProjectInput) => void
  isCreating?: boolean
  errorMessage?: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Presentational. A controlled dialog with a form for creating a project. */
export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  errorMessage,
}: CreateProjectDialogProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)

  // Reset the form whenever the dialog closes, so it reopens blank.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setName('')
      setKey('')
      setKeyEdited(false)
    }
    onOpenChange(next)
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() && key.trim()) onCreate({ key, name })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>A project holds flags across environments.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Checkout"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-key">Key</Label>
            <Input
              id="project-key"
              value={key}
              onChange={(e) => {
                setKeyEdited(true)
                setKey(slugify(e.target.value))
              }}
              placeholder="checkout"
              required
            />
            <p className="text-muted-foreground text-xs">Used in URLs. Lowercase, no spaces.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || !key.trim() || isCreating}>
              {isCreating ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
