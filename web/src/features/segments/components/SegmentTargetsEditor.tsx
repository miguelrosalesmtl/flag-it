import { useState, type KeyboardEvent } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface SegmentTargetsEditorProps {
  /** Section label, e.g. "Included" or "Excluded". */
  label: string
  /** The current context keys in this list. */
  values: string[]
  /** Emitted with the next list whenever a key is added or removed. */
  onChange: (values: string[]) => void
  placeholder?: string
}

/**
 * Presentational. Edits a list of context keys as removable chips plus an input
 * to add more. Owns only the add-input's text; the list itself lives above.
 */
export function SegmentTargetsEditor({
  label,
  values,
  onChange,
  placeholder,
}: SegmentTargetsEditorProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const key = draft.trim()
    if (key && !values.includes(key)) onChange([...values, key])
    setDraft('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-muted-foreground text-sm">None.</span>
        ) : (
          values.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 font-mono">
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="hover:text-destructive"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                ×
              </button>
            </Badge>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Add a context key'}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}
