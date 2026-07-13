import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { CLAUSE_OPERATORS, displayValues, parseValues } from '@/lib/clauses'
import { cn } from '@/lib/utils'
import type { Clause } from '@/types/segment'

export interface ClauseEditorProps {
  clause: Clause
  onChange: (clause: Clause) => void
  onRemove: () => void
  disabled?: boolean
}

const selectClass = cn(
  'border-input bg-transparent h-9 rounded-md border px-2 text-sm shadow-xs',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
  'disabled:opacity-50',
)

/**
 * Presentational. One clause: "context.attribute op [values]". The values input
 * keeps its raw text locally so typing a comma isn't reformatted mid-edit.
 */
export function ClauseEditor({ clause, onChange, onRemove, disabled }: ClauseEditorProps) {
  const [valuesText, setValuesText] = useState(displayValues(clause.values))

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
      <Input
        aria-label="Context kind"
        value={clause.contextKind ?? ''}
        onChange={(e) => onChange({ ...clause, contextKind: e.target.value })}
        placeholder="user"
        className="w-24"
        disabled={disabled}
      />
      <Input
        aria-label="Attribute"
        value={clause.attribute ?? ''}
        onChange={(e) => onChange({ ...clause, attribute: e.target.value })}
        placeholder="attribute"
        className="w-32"
        disabled={disabled}
      />
      <select
        aria-label="Operator"
        value={clause.op}
        onChange={(e) => onChange({ ...clause, op: e.target.value })}
        disabled={disabled}
        className={selectClass}
      >
        {CLAUSE_OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      <Input
        aria-label="Values"
        value={valuesText}
        onChange={(e) => {
          setValuesText(e.target.value)
          onChange({ ...clause, values: parseValues(e.target.value) })
        }}
        placeholder="value, value"
        className="min-w-40 flex-1"
        disabled={disabled}
      />
      <label className="text-muted-foreground flex items-center gap-1">
        <Checkbox
          checked={clause.negate ?? false}
          onCheckedChange={(v) => onChange({ ...clause, negate: v === true })}
          disabled={disabled}
        />
        negate
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Remove clause"
        onClick={onRemove}
        disabled={disabled}
      >
        ×
      </Button>
    </div>
  )
}
