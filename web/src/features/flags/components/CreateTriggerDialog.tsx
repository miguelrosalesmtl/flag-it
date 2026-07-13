import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { TriggerAction } from '@/types/trigger'

export interface CreateTriggerDialogProps {
  /** The environment the trigger targets, for the copy. */
  envKey: string
  /** Emitted with the chosen action and description. */
  onCreate: (action: TriggerAction, description: string) => void
  isSubmitting?: boolean
}

/**
 * Presentational. Create a flag trigger: pick what firing the webhook does and
 * describe what fires it. The container performs the write and reveals the URL.
 */
export function CreateTriggerDialog({ envKey, onCreate, isSubmitting }: CreateTriggerDialogProps) {
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<TriggerAction>('on')
  const [description, setDescription] = useState('')

  function handleOpenChange(next: boolean) {
    if (next) {
      setAction('on')
      setDescription('')
    }
    setOpen(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onCreate(action, description.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Create trigger
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a trigger</DialogTitle>
          <DialogDescription>
            A webhook URL that, when POSTed to, applies an action to{' '}
            <span className="font-mono">{envKey}</span>. The URL is shown once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <RadioGroup value={action} onValueChange={(v) => setAction(v as TriggerAction)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="on" id="trigger-on" />
                <Label htmlFor="trigger-on" className="font-normal">
                  Turn targeting on
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="off" id="trigger-off" />
                <Label htmlFor="trigger-off" className="font-normal">
                  Turn targeting off
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trigger-description">Description</Label>
            <Input
              id="trigger-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. PagerDuty incident webhook"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create trigger'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
