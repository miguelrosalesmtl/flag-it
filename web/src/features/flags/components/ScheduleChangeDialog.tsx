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
import { Textarea } from '@/components/ui/textarea'
import type { FlagInstruction } from '@/types/flag'

export interface ScheduleChangeDialogProps {
  /** Current on/off state, so the dialog proposes the sensible opposite by default. */
  currentOn: boolean
  /** The environment the change targets, for the copy. */
  envKey: string
  /** Emitted with the instructions, an RFC3339 apply time, and a rationale. */
  onSubmit: (instructions: FlagInstruction[], scheduledFor: string, comment: string) => void
  isSubmitting?: boolean
}

// A `datetime-local` value (local time, no zone) one hour from `from`.
function defaultLocalDateTime(from: Date): string {
  const d = new Date(from.getTime() + 60 * 60 * 1000)
  // Trim to minutes in the browser's local zone: YYYY-MM-DDTHH:mm.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Presentational. Schedule a flag change (turn on/off) for a future time. The
 * container performs the write; the backend scheduler applies it when due.
 */
export function ScheduleChangeDialog({
  currentOn,
  envKey,
  onSubmit,
  isSubmitting,
}: ScheduleChangeDialogProps) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<'on' | 'off'>(currentOn ? 'off' : 'on')
  const [when, setWhen] = useState('')
  const [comment, setComment] = useState('')

  function handleOpenChange(next: boolean) {
    if (next) {
      // Seed defaults on open (event handler — no Date() during render).
      setTarget(currentOn ? 'off' : 'on')
      setWhen(defaultLocalDateTime(new Date()))
      setComment('')
    }
    setOpen(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!when) return
    const kind = target === 'on' ? 'turnFlagOn' : 'turnFlagOff'
    onSubmit([{ kind }], new Date(when).toISOString(), comment.trim())
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Schedule change
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a change</DialogTitle>
          <DialogDescription>
            Apply a change to <span className="font-mono">{envKey}</span> automatically at a future
            time. Cancel it before then to prevent it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Targeting</Label>
            <RadioGroup value={target} onValueChange={(v) => setTarget(v as 'on' | 'off')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="on" id="sched-on" />
                <Label htmlFor="sched-on" className="font-normal">
                  Turn targeting on
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="off" id="sched-off" />
                <Label htmlFor="sched-off" className="font-normal">
                  Turn targeting off
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-when">Apply at</Label>
            <Input
              id="sched-when"
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sched-comment">Comment</Label>
            <Textarea
              id="sched-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why is this change scheduled?"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !when}>
              {isSubmitting ? 'Scheduling…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
