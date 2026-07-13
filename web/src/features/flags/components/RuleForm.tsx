import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RolloutEditor } from '@/features/flags/components/RolloutEditor'
import { VariationSelect } from '@/features/flags/components/VariationSelect'
import { ClauseEditor } from '@/features/segments/components/ClauseEditor'
import { evenPercents, percentsFromRollout, rolloutFromPercents } from '@/lib/variations'
import type { Clause } from '@/types/segment'
import type { VariationOrRollout } from '@/types/flag'

export interface RuleFormProps {
  /** The flag's variations, to label the served value. */
  variations: unknown[]
  /** Clauses to start from (defaults to one blank clause) — set when editing. */
  initialClauses?: Clause[]
  /** Served value to start from (defaults to variation 0) — set when editing. */
  initialServe?: VariationOrRollout
  submitLabel: string
  onSubmit: (clauses: Clause[], served: VariationOrRollout) => void
  /** Shown as a Cancel button when present (editing an existing rule). */
  onCancel?: () => void
  busy?: boolean
}

type ServeMode = 'variation' | 'rollout'

function newClause(): Clause {
  return { contextKind: 'user', attribute: '', op: 'in', values: [], negate: false }
}

/**
 * Presentational. Composes clauses plus a served value — a variation or a
 * percentage rollout — into a rule. Shared by the "new rule" builder and the
 * inline editor for an existing rule (which pre-fills the initial props).
 */
export function RuleForm({
  variations,
  initialClauses,
  initialServe,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: RuleFormProps) {
  const [draft, setDraft] = useState<Clause[]>(() =>
    initialClauses && initialClauses.length > 0 ? initialClauses : [newClause()],
  )
  const [serve, setServe] = useState<ServeMode>(() => (initialServe?.rollout ? 'rollout' : 'variation'))
  const [variation, setVariation] = useState(() => initialServe?.variation ?? 0)
  const [percents, setPercents] = useState<number[]>(() =>
    initialServe?.rollout
      ? percentsFromRollout(initialServe.rollout, variations.length)
      : evenPercents(variations.length),
  )
  const [bucketBy, setBucketBy] = useState(() => initialServe?.rollout?.bucketBy ?? '')

  const rolloutValid = percents.reduce((a, b) => a + b, 0) === 100
  const clausesValid = draft.length > 0 && draft.every((c) => c.attribute && c.values.length > 0)
  const canSubmit = clausesValid && (serve === 'variation' || rolloutValid)

  function submit() {
    if (!canSubmit) return
    const served: VariationOrRollout =
      serve === 'variation'
        ? { variation }
        : { rollout: rolloutFromPercents(percents, bucketBy.trim() || undefined) }
    onSubmit(draft, served)
    // Reset for reuse (the add builder). The inline editor is unmounted on save.
    setDraft(initialClauses && initialClauses.length > 0 ? initialClauses : [newClause()])
    setServe(initialServe?.rollout ? 'rollout' : 'variation')
    setVariation(initialServe?.variation ?? 0)
    setPercents(
      initialServe?.rollout
        ? percentsFromRollout(initialServe.rollout, variations.length)
        : evenPercents(variations.length),
    )
    setBucketBy(initialServe?.rollout?.bucketBy ?? '')
  }

  return (
    <div className="space-y-3">
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
            variations={variations}
            value={variation}
            onChange={setVariation}
            disabled={busy}
          />
        ) : (
          <div className="space-y-2">
            <RolloutEditor
              variations={variations}
              percents={percents}
              onChange={setPercents}
              disabled={busy}
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="bucket-by" className="text-muted-foreground font-normal">
                Bucket by
              </Label>
              <Input
                id="bucket-by"
                value={bucketBy}
                onChange={(e) => setBucketBy(e.target.value)}
                placeholder="key"
                disabled={busy}
                className="w-40"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" onClick={submit} disabled={!canSubmit || busy}>
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
