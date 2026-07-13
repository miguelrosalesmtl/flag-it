import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { instructionsText } from '@/lib/instructions'
import type { ScheduledChange, ScheduledStatus } from '@/types/scheduled-change'

const STATUS_VARIANT: Record<ScheduledStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  applied: 'default',
  cancelled: 'destructive',
  failed: 'destructive',
}

export interface ScheduledChangesCardProps {
  /** Scheduled changes for this flag + environment. */
  changes: ScheduledChange[]
  /** Cancel a pending change. Omit to render read-only. */
  onCancel?: (id: string) => void
  /** Disables the cancel buttons while a cancel is in flight. */
  busy?: boolean
}

/**
 * Presentational. Upcoming (and past) scheduled changes for one flag in one
 * environment. Pending ones can be cancelled; the container performs it.
 */
export function ScheduledChangesCard({ changes, onCancel, busy }: ScheduledChangesCardProps) {
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Scheduled changes</h2>
        <p className="text-muted-foreground text-sm">
          Changes applied automatically at a future time.
        </p>
      </div>

      {changes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No scheduled changes.</p>
      ) : (
        <ul className="space-y-2">
          {changes.map((c) => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  <span className="text-sm">{instructionsText(c.instructions)}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {c.status === 'applied' && c.applied_at
                    ? `Applied ${new Date(c.applied_at).toLocaleString()}`
                    : `For ${new Date(c.scheduled_for).toLocaleString()}`}
                  {c.created_by_email ? ` · by ${c.created_by_email}` : ''}
                </p>
                {c.comment ? (
                  <p className="text-muted-foreground text-xs">“{c.comment}”</p>
                ) : null}
                {c.status === 'failed' && c.error ? (
                  <p className="text-destructive text-xs">{c.error}</p>
                ) : null}
              </div>
              {c.status === 'pending' && onCancel ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onCancel(c.id)}
                >
                  Cancel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
