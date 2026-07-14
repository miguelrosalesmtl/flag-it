import { Badge } from '@/components/ui/badge'
import type { WebhookDelivery } from '@/types/webhook'

const STATUS_VARIANT: Record<WebhookDelivery['status'], 'secondary' | 'default' | 'destructive'> = {
  pending: 'secondary',
  success: 'default',
  failed: 'destructive',
}

export interface WebhookDeliveriesProps {
  /** Recent delivery attempts, newest first. */
  deliveries: WebhookDelivery[]
}

/** Presentational. A webhook's recent delivery attempts and their outcomes. */
export function WebhookDeliveries({ deliveries }: WebhookDeliveriesProps) {
  if (deliveries.length === 0) {
    return <p className="text-muted-foreground text-sm">No deliveries yet.</p>
  }

  return (
    <ul className="space-y-2">
      {deliveries.map((d) => (
        <li key={d.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
              <span className="font-mono text-sm">{d.event_type}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Attempt {d.attempts}
              {d.response_status ? ` · HTTP ${d.response_status}` : ''} ·{' '}
              {new Date(d.created_at).toLocaleString()}
            </p>
            {d.status === 'failed' && d.error ? (
              <p className="text-destructive text-xs">{d.error}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
