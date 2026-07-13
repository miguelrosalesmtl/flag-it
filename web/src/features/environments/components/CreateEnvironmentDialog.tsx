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
import type { CreateEnvironmentInput } from '@/types/environment'

export interface CreateEnvironmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Emitted with the new environment's key + name on submit. */
  onCreate: (input: CreateEnvironmentInput) => void
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

/** Presentational. A controlled dialog with a form for creating an environment. */
export function CreateEnvironmentDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  errorMessage,
}: CreateEnvironmentDialogProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)

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
          <DialogTitle>New environment</DialogTitle>
          <DialogDescription>
            Every existing flag starts off in the new environment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="env-name">Name</Label>
            <Input
              id="env-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="QA"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="env-key">Key</Label>
            <Input
              id="env-key"
              value={key}
              onChange={(e) => {
                setKeyEdited(true)
                setKey(slugify(e.target.value))
              }}
              placeholder="qa"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || !key.trim() || isCreating}>
              {isCreating ? 'Creating…' : 'Create environment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
