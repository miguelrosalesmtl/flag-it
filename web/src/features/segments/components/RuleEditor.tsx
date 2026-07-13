import { Button } from '@/components/ui/button'
import { ClauseEditor } from '@/features/segments/components/ClauseEditor'
import type { Clause, SegmentRule } from '@/types/segment'

export interface RuleEditorProps {
  rule: SegmentRule
  index: number
  onChange: (rule: SegmentRule) => void
  onRemove: () => void
  disabled?: boolean
}

function newClause(): Clause {
  return { contextKind: 'user', attribute: '', op: 'in', values: [], negate: false }
}

/** Presentational. One segment rule: a context is a member if it matches all clauses. */
export function RuleEditor({ rule, index, onChange, onRemove, disabled }: RuleEditorProps) {
  const clauses = rule.clauses

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase">Rule {index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
        >
          Remove rule
        </Button>
      </div>

      <div className="space-y-2">
        {clauses.map((clause, i) => (
          <ClauseEditor
            // Clauses are positional; index is a stable enough key here.
            key={i}
            clause={clause}
            onChange={(c) => onChange({ ...rule, clauses: clauses.map((x, j) => (j === i ? c : x)) })}
            onRemove={() => onChange({ ...rule, clauses: clauses.filter((_, j) => j !== i) })}
            disabled={disabled}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...rule, clauses: [...clauses, newClause()] })}
        disabled={disabled}
      >
        Add clause
      </Button>
    </div>
  )
}
