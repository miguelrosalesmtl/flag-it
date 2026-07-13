import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RolloutEditor } from '@/features/flags/components/RolloutEditor'
import { VariationSelect } from '@/features/flags/components/VariationSelect'
import { ClauseEditor } from '@/features/segments/components/ClauseEditor'
import { clauseText } from '@/lib/clauses'
import { evenPercents, percentsFromRollout, rolloutFromPercents, variationLabel } from '@/lib/variations'
import type { Clause } from '@/types/segment'
import type { Flag, FlagRule, VariationOrRollout } from '@/types/flag'

export interface FlagRulesProps {
  flag: Flag
  /** Existing targeting rules for the selected environment, in priority order. */
  rules: FlagRule[]
  /** Add a rule serving a variation or a rollout to contexts matching all clauses. */
  onAddRule: (clauses: Clause[], served: VariationOrRollout) => void
  /** Remove a rule by id. */
  onRemoveRule: (ruleId: string) => void
  /** Reorder the rules to the given full list of ids (priority = order). */
  onReorderRules: (orderedIds: string[]) => void
  busy?: boolean
}

function newClause(): Clause {
  return { contextKind: 'user', attribute: '', op: 'in', values: [], negate: false }
}

type ServeMode = 'variation' | 'rollout'

/** A one-line summary of what a rollout serves, e.g. "60% true, 40% false". */
function rolloutSummary(flag: Flag, rule: FlagRule): string {
  const parts = percentsFromRollout(rule.rollout, flag.variations.length)
    .map((p, i) => (p > 0 ? `${p}% ${variationLabel(flag.variations, i)}` : null))
    .filter(Boolean)
  return parts.join(', ') || 'a rollout'
}

/**
 * Presentational. A flag's targeting rules, in priority order (first match
 * wins). Existing rules can be reordered (↑/↓) or removed; a builder composes
 * clauses plus either a served variation or a percentage rollout into a new rule.
 */
export function FlagRules({
  flag,
  rules,
  onAddRule,
  onRemoveRule,
  onReorderRules,
  busy,
}: FlagRulesProps) {
  const [draft, setDraft] = useState<Clause[]>([newClause()])
  const [serve, setServe] = useState<ServeMode>('variation')
  const [variation, setVariation] = useState(0)
  const [percents, setPercents] = useState<number[]>(() => evenPercents(flag.variations.length))

  const rolloutValid = percents.reduce((a, b) => a + b, 0) === 100
  const clausesValid = draft.length > 0 && draft.every((c) => c.attribute && c.values.length > 0)
  const canAdd = clausesValid && (serve === 'variation' || rolloutValid)

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

  function add() {
    if (!canAdd) return
    const served: VariationOrRollout =
      serve === 'variation' ? { variation } : { rollout: rolloutFromPercents(percents) }
    onAddRule(draft, served)
    setDraft([newClause()])
    setServe('variation')
    setVariation(0)
    setPercents(evenPercents(flag.variations.length))
  }

  return (
    <div className="space-y-4">
      {rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={rule.id ?? i} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDraft((prev) => [...prev, newClause()])}
          disabled={busy}
        >
          Add clause
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">serve</span>
            <Tabs value={serve} onValueChange={(v) => setServe(v as ServeMode)}>
              <TabsList>
                <TabsTrigger value="variation">A variation</TabsTrigger>
                <TabsTrigger value="rollout">A rollout</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {serve === 'variation' ? (
            <VariationSelect
              variations={flag.variations}
              value={variation}
              onChange={setVariation}
              disabled={busy}
            />
          ) : (
            <RolloutEditor
              variations={flag.variations}
              percents={percents}
              onChange={setPercents}
              disabled={busy}
            />
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={add} disabled={!canAdd || busy}>
            Add rule
          </Button>
        </div>
      </div>
    </div>
  )
}
