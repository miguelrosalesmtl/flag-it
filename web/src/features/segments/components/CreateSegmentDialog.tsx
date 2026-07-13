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
import { Textarea } from '@/components/ui/textarea'
import type { CreateSegmentInput } from '@/types/segment'

export interface CreateSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Emitted with the new segment's key, name, and description on submit. */
  onCreate: (input: CreateSegmentInput) => void
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

/** Presentational. A controlled dialog with a form for creating a segment. */
export function CreateSegmentDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  errorMessage,
}: CreateSegmentDialogProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [description, setDescription] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName('')
      setKey('')
      setKeyEdited(false)
      setDescription('')
    }
    onOpenChange(next)
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() && key.trim()) onCreate({ key, name, description: description.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New segment</DialogTitle>
          <DialogDescription>
            A reusable group of contexts that flag rules can target.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="segment-name">Name</Label>
            <Input
              id="segment-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Beta users"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="segment-key">Key</Label>
            <Input
              id="segment-key"
              value={key}
              onChange={(e) => {
                setKeyEdited(true)
                setKey(slugify(e.target.value))
              }}
              placeholder="beta-users"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="segment-description">Description</Label>
            <Textarea
              id="segment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || !key.trim() || isCreating}>
              {isCreating ? 'Creating…' : 'Create segment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
