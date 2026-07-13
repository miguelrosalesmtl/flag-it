import { Label } from '@/components/ui/label'
import { IndividualTargets } from '@/features/flags/components/IndividualTargets'
import { VariationSelect } from '@/features/flags/components/VariationSelect'
import type { Flag, FlagConfig } from '@/types/flag'

export interface FlagTargetingProps {
  flag: Flag
  config: FlagConfig
  /** Set the default variation served when the flag is on. */
  onSetFallthrough: (variation: number) => void
  /** Set the variation served when the flag is off. */
  onSetOffVariation: (variation: number) => void
  onAddTarget: (variation: number, key: string) => void
  onRemoveTarget: (variation: number, key: string) => void
  busy?: boolean
}

/**
 * Presentational. A flag's targeting for one environment: the default rule
 * (what it serves when on / off) and individual targets. Percentage rollouts on
 * the fallthrough are a later build; choosing a variation here replaces one.
 */
export function FlagTargeting({
  flag,
  config,
  onSetFallthrough,
  onSetOffVariation,
  onAddTarget,
  onRemoveTarget,
  busy,
}: FlagTargetingProps) {
  const fallthrough = config.fallthrough.variation ?? 0
  const isRollout = config.fallthrough.rollout !== undefined

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Default rule</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="fallthrough" className="text-muted-foreground">
            When on, serve
          </Label>
          <VariationSelect
            id="fallthrough"
            variations={flag.variations}
            value={fallthrough}
            onChange={onSetFallthrough}
            disabled={busy}
          />
          {isRollout ? (
            <span className="text-muted-foreground text-xs">(replaces the percentage rollout)</span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="off-variation" className="text-muted-foreground">
            When off, serve
          </Label>
          <VariationSelect
            id="off-variation"
            variations={flag.variations}
            value={config.off_variation}
            onChange={onSetOffVariation}
            disabled={busy}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Individual targets</h2>
        <IndividualTargets
          variations={flag.variations}
          targets={config.targets}
          onAdd={onAddTarget}
          onRemove={onRemoveTarget}
          disabled={busy}
        />
      </section>
    </div>
  )
}
