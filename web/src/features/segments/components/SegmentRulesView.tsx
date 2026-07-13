import type { Clause, SegmentRule } from '@/types/segment'

export interface SegmentRulesViewProps {
  /** The segment's rules (read-only display for now). */
  rules: SegmentRule[]
}

function clauseText(clause: Clause): string {
  const attr = clause.attribute ? `${clause.contextKind ?? 'user'} ${clause.attribute}` : 'segment'
  const op = clause.negate ? `not ${clause.op}` : clause.op
  const values = clause.values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')
  return `${attr} ${op} [${values}]`
}

/**
 * Presentational. Renders a segment's rules read-only. Editing clauses is a
 * separate (larger) build; this shows what the rules currently match.
 */
export function SegmentRulesView({ rules }: SegmentRulesViewProps) {
  if (rules.length === 0) {
    return <p className="text-muted-foreground text-sm">No rules.</p>
  }

  return (
    <ol className="space-y-3">
      {rules.map((rule, i) => (
        <li key={rule.id ?? i} className="rounded-lg border p-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Rule {i + 1}</p>
          <div className="space-y-1 text-sm">
            {rule.clauses.map((clause, j) => (
              <p key={j}>
                <span className="text-muted-foreground">{j === 0 ? 'If' : 'and'}</span>{' '}
                <span className="font-mono">{clauseText(clause)}</span>
              </p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}
