import { Button } from '@/components/ui/button'
import { RuleEditor } from '@/features/segments/components/RuleEditor'
import type { Clause, SegmentRule } from '@/types/segment'

export interface SegmentRulesEditorProps {
  rules: SegmentRule[]
  onChange: (rules: SegmentRule[]) => void
  disabled?: boolean
}

function newRule(): SegmentRule {
  const clause: Clause = { contextKind: 'user', attribute: '', op: 'in', values: [], negate: false }
  return { clauses: [clause] }
}

/** Presentational. A segment's rules — a context is a member if it matches any rule. */
export function SegmentRulesEditor({ rules, onChange, disabled }: SegmentRulesEditorProps) {
  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <p className="text-muted-foreground text-sm">No rules.</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, i) => (
            <RuleEditor
              key={rule.id ?? i}
              rule={rule}
              index={i}
              onChange={(r) => onChange(rules.map((x, j) => (j === i ? r : x)))}
              onRemove={() => onChange(rules.filter((_, j) => j !== i))}
              disabled={disabled}
            />
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rules, newRule()])}
        disabled={disabled}
      >
        Add rule
      </Button>
    </div>
  )
}
