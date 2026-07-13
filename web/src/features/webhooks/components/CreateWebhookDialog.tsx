import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreateWebhookInput } from '@/types/webhook'
import { EVENT_TYPE_ALL, WEBHOOK_EVENT_TYPES } from '@/types/webhook'

export interface CreateWebhookDialogProps {
  onCreate: (input: CreateWebhookInput) => void
  isSubmitting?: boolean
}

/**
 * Presentational. Register a webhook: a URL, what events it wants (all, or a
 * curated subset), and a description. The container performs the write.
 */
export function CreateWebhookDialog({ onCreate, isSubmitting }: CreateWebhookDialogProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [allEvents, setAllEvents] = useState(true)
  const [selected, setSelected] = useState<string[]>([])

  function handleOpenChange(next: boolean) {
    if (next) {
      setUrl('')
      setDescription('')
      setAllEvents(true)
      setSelected([])
    }
    setOpen(next)
  }

  function toggleEvent(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  const canSubmit = url.trim() !== '' && (allEvents || selected.length > 0)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onCreate({
      url: url.trim(),
      event_types: allEvents ? [EVENT_TYPE_ALL] : selected,
      description: description.trim(),
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">Add webhook</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a webhook</DialogTitle>
          <DialogDescription>
            Events are delivered as signed POSTs. The signing secret is shown once on create.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Payload URL</Label>
            <Input
              id="webhook-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/hooks/flag-it"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-description">Description</Label>
            <Input
              id="webhook-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Slack notifications"
            />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="webhook-all"
                checked={allEvents}
                onCheckedChange={(v) => setAllEvents(v === true)}
              />
              <Label htmlFor="webhook-all" className="font-normal">
                All events
              </Label>
            </div>
            {!allEvents ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {WEBHOOK_EVENT_TYPES.map((ev) => (
                  <div key={ev.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`ev-${ev.value}`}
                      checked={selected.includes(ev.value)}
                      onCheckedChange={() => toggleEvent(ev.value)}
                    />
                    <Label htmlFor={`ev-${ev.value}`} className="font-normal">
                      {ev.label}
                    </Label>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
