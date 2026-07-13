import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { RuleForm } from '@/features/flags/components/RuleForm'
import { clauseText } from '@/lib/clauses'
import { percentsFromRollout, variationLabel } from '@/lib/variations'
import type { Clause } from '@/types/segment'
import type { Flag, FlagRule, VariationOrRollout } from '@/types/flag'

export interface FlagRulesProps {
  flag: Flag
  /** Existing targeting rules for the selected environment, in priority order. */
  rules: FlagRule[]
  /** Add a rule serving a variation or a rollout to contexts matching all clauses. */
  onAddRule: (clauses: Clause[], served: VariationOrRollout) => void
  /** Replace an existing rule's clauses and served value in place (keeps priority). */
  onUpdateRule: (ruleId: string, clauses: Clause[], served: VariationOrRollout) => void
  /** Remove a rule by id. */
  onRemoveRule: (ruleId: string) => void
  /** Reorder the rules to the given full list of ids (priority = order). */
  onReorderRules: (orderedIds: string[]) => void
  busy?: boolean
}

/** A one-line summary of what a rollout serves, e.g. "60% true, 40% false". */
function rolloutSummary(flag: Flag, rule: FlagRule): string {
  const parts = percentsFromRollout(rule.rollout, flag.variations.length)
    .map((p, i) => (p > 0 ? `${p}% ${variationLabel(flag.variations, i)}` : null))
    .filter(Boolean)
  const summary = parts.join(', ') || 'a rollout'

  const { bucketBy, contextKind } = rule.rollout ?? {}
  // A context kind matters even at the default "key" bucket (e.g. by organization).
  if (contextKind) return `${summary} (by ${contextKind} ${bucketBy || 'key'})`
  if (bucketBy) return `${summary} (by ${bucketBy})`
  return summary
}

/** The served value of an existing rule, for pre-filling the edit form. */
function ruleServe(rule: FlagRule): VariationOrRollout {
  return rule.variation !== undefined ? { variation: rule.variation } : { rollout: rule.rollout }
}

/**
 * Presentational. A flag's targeting rules, in priority order (first match
 * wins). Existing rules can be edited in place, reordered (↑/↓), or removed; a
 * builder composes clauses plus a variation or rollout into a new rule.
 */
export function FlagRules({
  flag,
  rules,
  onAddRule,
  onUpdateRule,
  onRemoveRule,
  onReorderRules,
  busy,
}: FlagRulesProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  function move(index: number, delta: number) {
    const ids = rules.map((r) => r.id).filter((id): id is string => !!id)
    const target = index + delta
    const a = ids[index]
    const b = ids[target]
    if (a === undefined || b === undefined) return
    ids[index] = b
    ids[target] = a
    onReorderRules(ids)
  }

  return (
    <div className="space-y-4">
      {rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={rule.id ?? i} className="rounded-lg border p-3 text-sm">
              {editingId && rule.id === editingId ? (
                <RuleForm
                  variations={flag.variations}
                  initialClauses={rule.clauses}
                  initialServe={ruleServe(rule)}
                  submitLabel="Save"
                  onSubmit={(clauses, served) => {
                    onUpdateRule(rule.id!, clauses, served)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                  busy={busy}
                />
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Move rule up"
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => move(i, -1)}
                      disabled={busy || i === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Move rule down"
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => move(i, 1)}
                      disabled={busy || i === rules.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                  <div className="flex-1 space-y-1">
                    {rule.clauses.map((clause, j) => (
                      <p key={j}>
                        <span className="text-muted-foreground">{j === 0 ? 'If' : 'and'}</span>{' '}
                        <span className="font-mono">{clauseText(clause)}</span>
                      </p>
                    ))}
                    <p className="text-muted-foreground">
                      serve{' '}
                      <span className="font-mono">
                        {rule.variation !== undefined
                          ? variationLabel(flag.variations, rule.variation)
                          : rolloutSummary(flag, rule)}
                      </span>
                    </p>
                  </div>
                  {rule.id ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(rule.id!)}
                        disabled={busy}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveRule(rule.id!)}
                        disabled={busy}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No rules.</p>
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <p className="text-xs font-semibold uppercase">New rule</p>
        <RuleForm variations={flag.variations} submitLabel="Add rule" onSubmit={onAddRule} busy={busy} />
      </div>
    </div>
  )
}
