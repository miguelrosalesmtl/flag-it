import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { VariationSelect } from '@/features/flags/components/VariationSelect'
import { ClauseEditor } from '@/features/segments/components/ClauseEditor'
import { clauseText } from '@/lib/clauses'
import { variationLabel } from '@/lib/variations'
import type { Clause } from '@/types/segment'
import type { Flag, FlagRule } from '@/types/flag'

export interface FlagRulesProps {
  flag: Flag
  /** Existing targeting rules for the selected environment. */
  rules: FlagRule[]
  /** Add a rule serving `variation` to contexts matching all `clauses`. */
  onAddRule: (clauses: Clause[], variation: number) => void
  /** Remove a rule by id. */
  onRemoveRule: (ruleId: string) => void
  busy?: boolean
}

function newClause(): Clause {
  return { contextKind: 'user', attribute: '', op: 'in', values: [], negate: false }
}

/**
 * Presentational. A flag's targeting rules. Existing rules are shown read-only
 * with a remove (flag rules are edited by add/remove instructions, not in
 * place); a builder composes clauses + a served variation into a new rule.
 */
export function FlagRules({ flag, rules, onAddRule, onRemoveRule, busy }: FlagRulesProps) {
  const [draft, setDraft] = useState<Clause[]>([newClause()])
  const [variation, setVariation] = useState(0)

  const canAdd = draft.length > 0 && draft.every((c) => c.attribute && c.values.length > 0)

  function add() {
    if (!canAdd) return
    onAddRule(draft, variation)
    setDraft([newClause()])
    setVariation(0)
  }

  return (
    <div className="space-y-4">
      {rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={rule.id ?? i} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
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
                      : 'a rollout'}
                  </span>
                </p>
              </div>
              {rule.id ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveRule(rule.id!)}
                  disabled={busy}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No rules.</p>
      )}

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <p className="text-xs font-semibold uppercase">New rule</p>
        <div className="space-y-2">
          {draft.map((clause, i) => (
            <ClauseEditor
              key={i}
              clause={clause}
              onChange={(c) => setDraft((prev) => prev.map((x, j) => (j === i ? c : x)))}
              onRemove={() => setDraft((prev) => prev.filter((_, j) => j !== i))}
              disabled={busy}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDraft((prev) => [...prev, newClause()])}
            disabled={busy}
          >
            Add clause
          </Button>
          <span className="text-muted-foreground ml-auto">serve</span>
          <VariationSelect
            variations={flag.variations}
            value={variation}
            onChange={setVariation}
            disabled={busy}
          />
          <Button type="button" onClick={add} disabled={!canAdd || busy}>
            Add rule
          </Button>
        </div>
      </div>
    </div>
  )
}
