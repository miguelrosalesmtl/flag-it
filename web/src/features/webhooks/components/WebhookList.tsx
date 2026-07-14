import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Webhook } from '@/types/webhook'

export interface WebhookListProps {
  webhooks: Webhook[]
  /** A just-minted signing secret to reveal once (create/reset). */
  revealedSecret?: string | null
  onDismissSecret?: () => void
  /** A transient notice (e.g. "test event queued"). */
  notice?: string | null
  onToggleEnabled?: (id: string, enabled: boolean) => void
  onTest?: (id: string) => void
  onViewDeliveries?: (id: string) => void
  onReset?: (id: string) => void
  onDelete?: (id: string) => void
  busy?: boolean
}

/**
 * Presentational. A organization's outbound webhooks: URL, subscribed events, and
 * enable / test / reset / delete controls. A freshly minted signing secret is
 * revealed once at the top (it can't be re-fetched).
 */
export function WebhookList({
  webhooks,
  revealedSecret,
  onDismissSecret,
  notice,
  onToggleEnabled,
  onTest,
  onViewDeliveries,
  onReset,
  onDelete,
  busy,
}: WebhookListProps) {
  return (
    <div className="space-y-3">
      {revealedSecret ? (
        <div className="border-primary/40 bg-primary/5 space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Signing secret — copy it now, it won’t be shown again</p>
          <code className="block overflow-x-auto rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">
            {revealedSecret}
          </code>
          {onDismissSecret ? (
            <Button size="sm" variant="ghost" onClick={onDismissSecret}>
              Dismiss
            </Button>
          ) : null}
        </div>
      ) : null}

      {notice ? <p className="text-muted-foreground text-sm">{notice}</p> : null}

      {webhooks.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No webhooks yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {webhooks.map((w) => (
            <li key={w.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm">{w.url}</span>
                  {!w.enabled ? <Badge variant="destructive">Disabled</Badge> : null}
                </div>
                {w.description ? <p className="text-sm">{w.description}</p> : null}
                <div className="flex flex-wrap gap-1">
                  {w.event_types.map((e) => (
                    <Badge key={e} variant="secondary">
                      {e === '*' ? 'All events' : e}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={w.enabled}
                  onCheckedChange={(v) => onToggleEnabled?.(w.id, v)}
                  disabled={busy || !onToggleEnabled}
                  aria-label={`Enable webhook ${w.description || w.url}`}
                />
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onTest?.(w.id)}>
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewDeliveries?.(w.id)}
                >
                  Deliveries
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onReset?.(w.id)}>
                  Reset secret
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete?.(w.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
