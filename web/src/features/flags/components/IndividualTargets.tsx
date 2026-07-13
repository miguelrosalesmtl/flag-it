import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VariationSelect } from '@/features/flags/components/VariationSelect'
import { variationLabel } from '@/lib/variations'
import type { Target } from '@/types/flag'

export interface IndividualTargetsProps {
  /** The flag's variations. */
  variations: unknown[]
  /** Current individual targets. */
  targets: Target[]
  /** Add a context key to a variation. */
  onAdd: (variation: number, key: string) => void
  /** Remove a context key from a variation. */
  onRemove: (variation: number, key: string) => void
  disabled?: boolean
}

/**
 * Presentational. Serve specific variations to specific context keys. Owns only
 * the add-row's draft; the target list lives above.
 */
export function IndividualTargets({
  variations,
  targets,
  onAdd,
  onRemove,
  disabled,
}: IndividualTargetsProps) {
  const [key, setKey] = useState('')
  const [variation, setVariation] = useState(0)

  function add() {
    const k = key.trim()
    if (k) onAdd(variation, k)
    setKey('')
  }

  const hasTargets = targets.some((t) => t.values.length > 0)

  return (
    <div className="space-y-3">
      {hasTargets ? (
        <ul className="space-y-2">
          {targets.map((t) =>
            t.values.map((v) => (
              <li key={`${t.variation}:${v}`} className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="font-mono">
                  {v}
                </Badge>
                <span className="text-muted-foreground">serves</span>
                <span className="font-mono">{variationLabel(variations, t.variation)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${v}`}
                  className="text-muted-foreground hover:text-destructive ml-auto"
                  disabled={disabled}
                  onClick={() => onRemove(t.variation, v)}
                >
                  ×
                </button>
              </li>
            )),
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">No individual targets.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Context key"
          className="w-48"
          disabled={disabled}
        />
        <span className="text-muted-foreground text-sm">serves</span>
        <VariationSelect
          variations={variations}
          value={variation}
          onChange={setVariation}
          disabled={disabled}
        />
        <Button type="button" variant="outline" onClick={add} disabled={disabled || !key.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}
