import { Badge } from '@/components/ui/badge'
import type { AuditEntry } from '@/types/audit'

export interface AuditListProps {
  /** Resolved audit entries, newest first. */
  entries: AuditEntry[]
}

/** Presentational. A tenant's change history: who did what, to which resource, when. */
export function AuditList({ entries }: AuditListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No activity yet.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{e.action}</Badge>
              {e.resource_key ? (
                <span className="font-mono text-sm">
                  {e.resource_type}/{e.resource_key}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">{e.resource_type}</span>
              )}
            </div>
            {e.comment ? <p className="text-muted-foreground text-sm">“{e.comment}”</p> : null}
            <p className="text-muted-foreground text-xs">
              {e.actor_email || 'system'} · {new Date(e.created_at).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
