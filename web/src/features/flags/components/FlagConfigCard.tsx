import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { Flag, FlagConfig } from '@/types/flag'

export interface FlagConfigCardProps {
  /** The flag definition — provides the variation values referenced by the config. */
  flag: Flag
  /** Resolved config for the selected environment. */
  config: FlagConfig
  /** Emitted with the desired on-state when the switch is flipped. */
  onToggle: (on: boolean) => void
  /** Disables the switch while the toggle request is in flight. */
  isToggling?: boolean
}

/** Render a variation's value for display (strings plain, everything else as JSON). */
function variationLabel(variations: unknown[], index: number): string {
  const v = variations[index]
  if (v === undefined) return `#${index}`
  return typeof v === 'string' ? v : JSON.stringify(v)
}

/** Describe what the fallthrough serves — a variation, or a percentage rollout. */
function fallthroughLabel(config: FlagConfig, variations: unknown[]): string {
  if (config.fallthrough.rollout) return 'a percentage rollout'
  if (config.fallthrough.variation !== undefined) {
    return variationLabel(variations, config.fallthrough.variation)
  }
  return '—'
}

/**
 * Presentational. The on/off switch for a flag in one environment, plus a
 * read-only summary of what it serves. Flipping the switch only calls onToggle —
 * the container decides what that means.
 */
export function FlagConfigCard({ flag, config, onToggle, isToggling }: FlagConfigCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {config.on ? 'On' : 'Off'}
        </CardTitle>
        <Switch
          checked={config.on}
          onCheckedChange={onToggle}
          disabled={isToggling}
          aria-label="Toggle flag"
        />
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-1 text-sm">
        <p>
          When <span className="font-medium">on</span>, serves{' '}
          <span className="font-mono">{fallthroughLabel(config, flag.variations)}</span>.
        </p>
        <p>
          When <span className="font-medium">off</span>, serves{' '}
          <span className="font-mono">
            {variationLabel(flag.variations, config.off_variation)}
          </span>
          .
        </p>
        <p className="text-xs">
          {config.rules.length} rule{config.rules.length === 1 ? '' : 's'} ·{' '}
          {config.targets.length} target{config.targets.length === 1 ? '' : 's'} · v
          {config.version}
        </p>
      </CardContent>
    </Card>
  )
}
