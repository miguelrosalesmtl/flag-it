import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { FlagTrigger } from '@/types/trigger'

export interface TriggersCardProps {
  /** Triggers for this flag + environment. */
  triggers: FlagTrigger[]
  /** A just-created/reset webhook URL to reveal once. */
  revealedUrl?: string | null
  onDismissUrl?: () => void
  onToggleEnabled?: (id: string, enabled: boolean) => void
  onReset?: (id: string) => void
  onDelete?: (id: string) => void
  busy?: boolean
}

/**
 * Presentational. A flag's inbound webhook triggers in one environment: their
 * action, description, and firing stats, with enable/reset/delete controls. A
 * freshly minted URL is revealed once at the top (it can't be re-fetched).
 */
export function TriggersCard({
  triggers,
  revealedUrl,
  onDismissUrl,
  onToggleEnabled,
  onReset,
  onDelete,
  busy,
}: TriggersCardProps) {
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Triggers</h2>
        <p className="text-muted-foreground text-sm">
          Webhook URLs that apply an action when POSTed to — e.g. from an alerting system.
        </p>
      </div>

      {revealedUrl ? (
        <div className="border-primary/40 bg-primary/5 space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Webhook URL — copy it now, it won’t be shown again</p>
          <code className="block overflow-x-auto rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">
            {revealedUrl}
          </code>
          {onDismissUrl ? (
            <Button size="sm" variant="ghost" onClick={onDismissUrl}>
              Dismiss
            </Button>
          ) : null}
        </div>
      ) : null}

      {triggers.length === 0 ? (
        <p className="text-muted-foreground text-sm">No triggers.</p>
      ) : (
        <ul className="space-y-2">
          {triggers.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-4 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={t.action === 'on' ? 'default' : 'secondary'}>
                    Turn {t.action}
                  </Badge>
                  {!t.enabled ? <Badge variant="destructive">Disabled</Badge> : null}
                </div>
                {t.description ? <p className="text-sm">{t.description}</p> : null}
                <p className="text-muted-foreground text-xs">
                  Fired {t.exec_count}×
                  {t.last_executed_at
                    ? ` · last ${new Date(t.last_executed_at).toLocaleString()}`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={t.enabled}
                  onCheckedChange={(v) => onToggleEnabled?.(t.id, v)}
                  disabled={busy || !onToggleEnabled}
                  aria-label={`Enable trigger ${t.description || t.action}`}
                />
                <Button size="sm" variant="outline" disabled={busy} onClick={() => onReset?.(t.id)}>
                  Reset URL
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => onDelete?.(t.id)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
