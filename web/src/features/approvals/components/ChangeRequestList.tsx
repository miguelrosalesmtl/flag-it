import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { instructionsText } from '@/lib/instructions'
import type { ChangeRequest, ChangeStatus } from '@/types/change'

const STATUS_VARIANT: Record<ChangeStatus, 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
}

export interface ChangeRequestListProps {
  /** Resolved change requests. Never undefined — the container waits for data. */
  changes: ChangeRequest[]
  /** Approve/reject a pending request. Omit to render read-only. */
  onReview?: (id: string, action: 'approve' | 'reject') => void
  /** Disables the action buttons while a review is in flight. */
  busy?: boolean
}

/**
 * Presentational. Lists change requests as cards: what is proposed, by whom, and
 * — for pending ones — approve/reject actions. The container performs the review.
 */
export function ChangeRequestList({ changes, onReview, busy }: ChangeRequestListProps) {
  if (changes.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No change requests.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {changes.map((c) => (
        <li key={c.id} className="space-y-2 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{c.flag_key}</span>
                <Badge variant="outline">{c.environment_key}</Badge>
                <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
              </div>
              <p className="text-sm">{instructionsText(c.instructions)}</p>
              {c.comment ? (
                <p className="text-muted-foreground text-sm">“{c.comment}”</p>
              ) : null}
              <p className="text-muted-foreground text-xs">
                Requested by {c.requested_by_email} · {new Date(c.created_at).toLocaleString()}
              </p>
              {c.status !== 'pending' && c.reviewed_by_email ? (
                <p className="text-muted-foreground text-xs">
                  {c.status === 'approved' ? 'Approved' : 'Rejected'} by {c.reviewed_by_email}
                  {c.review_comment ? ` — “${c.review_comment}”` : ''}
                </p>
              ) : null}
            </div>

            {c.status === 'pending' && onReview ? (
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onReview(c.id, 'reject')}
                >
                  Reject
                </Button>
                <Button size="sm" disabled={busy} onClick={() => onReview(c.id, 'approve')}>
                  Approve
                </Button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
