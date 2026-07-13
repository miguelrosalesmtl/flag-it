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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { FlagInstruction } from '@/types/flag'

export interface RequestChangeDialogProps {
  /** Current on/off state, so the dialog proposes the sensible opposite by default. */
  currentOn: boolean
  /** The environment the change targets, for the copy. */
  envKey: string
  /** Emitted with the proposed instructions and rationale. */
  onSubmit: (instructions: FlagInstruction[], comment: string) => void
  isSubmitting?: boolean
}

/**
 * Presentational. Propose turning a flag on or off in one environment for
 * review, instead of applying it directly. The container performs the request.
 */
export function RequestChangeDialog({
  currentOn,
  envKey,
  onSubmit,
  isSubmitting,
}: RequestChangeDialogProps) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<'on' | 'off'>(currentOn ? 'off' : 'on')
  const [comment, setComment] = useState('')

  function reset() {
    setTarget(currentOn ? 'off' : 'on')
    setComment('')
  }

  function handleOpenChange(next: boolean) {
    if (next) reset()
    setOpen(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const kind = target === 'on' ? 'turnFlagOn' : 'turnFlagOff'
    onSubmit([{ kind }], comment.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Request change
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a change</DialogTitle>
          <DialogDescription>
            Propose a change to <span className="font-mono">{envKey}</span> for review. It is
            applied only once a reviewer approves it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Targeting</Label>
            <RadioGroup value={target} onValueChange={(v) => setTarget(v as 'on' | 'off')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="on" id="change-on" />
                <Label htmlFor="change-on" className="font-normal">
                  Turn targeting on
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="off" id="change-off" />
                <Label htmlFor="change-off" className="font-normal">
                  Turn targeting off
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="change-comment">Comment</Label>
            <Textarea
              id="change-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why is this change needed?"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
