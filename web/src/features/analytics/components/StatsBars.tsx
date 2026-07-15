export interface StatsBarRow {
  key: string
  label: string
  count: number
}

export interface StatsBarsProps {
  rows: StatsBarRow[]
  total: number
  /** When set, each row's label becomes a button emitting its key. */
  onSelect?: (key: string) => void
  emptyLabel?: string
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

/**
 * Presentational. A ranked bar list: one row per entry, each a share-of-total bar
 * with its count and percentage. Used for both per-variation and per-flag stats.
 */
export function StatsBars({ rows, total, onSelect, emptyLabel = 'No evaluations yet.' }: StatsBarsProps) {
  if (total === 0 || rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="space-y-1">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            {onSelect ? (
              <button
                type="button"
                className="truncate font-mono hover:underline"
                onClick={() => onSelect(row.key)}
              >
                {row.label}
              </button>
            ) : (
              <span className="truncate font-mono">{row.label}</span>
            )}
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {row.count.toLocaleString()} · {pct(row.count, total)}%
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${pct(row.count, total)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
