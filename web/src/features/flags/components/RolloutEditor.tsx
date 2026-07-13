import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { variationLabel } from '@/lib/variations'

export interface RolloutEditorProps {
  /** The flag's variations (opaque values), one row each. */
  variations: unknown[]
  /** Percentage per variation index (0–100), aligned to `variations`. */
  percents: number[]
  onChange: (percents: number[]) => void
  disabled?: boolean
}

function clampPercent(value: string): number {
  const n = Math.round(Number(value))
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/**
 * Presentational. A percentage rollout: one weight per variation, summing to
 * 100%. Works in whole percentages; the caller converts to backend weights.
 */
export function RolloutEditor({ variations, percents, onChange, disabled }: RolloutEditorProps) {
  const total = percents.reduce((a, b) => a + b, 0)
  return (
    <div className="space-y-2">
      {variations.map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={percents[i] ?? 0}
            onChange={(e) => onChange(percents.map((p, j) => (j === i ? clampPercent(e.target.value) : p)))}
            disabled={disabled}
            aria-label={`${variationLabel(variations, i)} percentage`}
            className="w-20"
          />
          <span className="text-muted-foreground text-sm">%</span>
          <span className="font-mono text-sm">{variationLabel(variations, i)}</span>
        </div>
      ))}
      <p className={cn('text-xs', total === 100 ? 'text-muted-foreground' : 'text-destructive')}>
        Total: {total}%{total !== 100 ? ' — must be 100%' : ''}
      </p>
    </div>
  )
}
