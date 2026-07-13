import { cn } from '@/lib/utils'
import { variationLabel } from '@/lib/variations'

export interface VariationSelectProps {
  id?: string
  /** The flag's variations (opaque values). */
  variations: unknown[]
  /** Selected variation index. */
  value: number
  /** Emitted with the new variation index. */
  onChange: (index: number) => void
  disabled?: boolean
}

/** Presentational. A native select over a flag's variations, keyed by index. */
export function VariationSelect({ id, variations, value, onChange, disabled }: VariationSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className={cn(
        'border-input bg-transparent h-9 rounded-md border px-3 py-1 font-mono text-sm shadow-xs',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'disabled:opacity-50',
      )}
    >
      {variations.map((_, i) => (
        <option key={i} value={i}>
          {variationLabel(variations, i)}
        </option>
      ))}
    </select>
  )
}
