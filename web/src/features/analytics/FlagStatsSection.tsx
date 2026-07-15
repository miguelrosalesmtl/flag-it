import { useState } from 'react'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsBars } from '@/features/analytics/components/StatsBars'
import { useFlagStats } from '@/features/analytics/hooks/useAnalytics'
import { variationLabel } from '@/lib/variations'
import { STATS_WINDOWS } from '@/types/analytics'

export interface FlagStatsSectionProps {
  organizationSlug: string
  projectKey: string
  flagKey: string
  envKey: string
  variations: unknown[]
}

/**
 * Container. Evaluation insights for one flag in the selected environment: total
 * evaluations over a lookback window, and the per-variation split.
 */
export function FlagStatsSection({
  organizationSlug,
  projectKey,
  flagKey,
  envKey,
  variations,
}: FlagStatsSectionProps) {
  const [since, setSince] = useState('24h')
  const stats = useFlagStats(organizationSlug, projectKey, flagKey, envKey, since)

  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Evaluations</h2>
          <p className="text-muted-foreground text-sm">
            {stats.data
              ? `${stats.data.total.toLocaleString()} in the last ${STATS_WINDOWS.find((w) => w.value === since)?.label ?? since}`
              : 'How this flag is resolving.'}
          </p>
        </div>
        <Tabs value={since} onValueChange={setSince}>
          <TabsList>
            {STATS_WINDOWS.map((w) => (
              <TabsTrigger key={w.value} value={w.value}>
                {w.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {stats.isPending ? (
        <Skeleton className="h-20" />
      ) : stats.isError ? (
        <ErrorState message={stats.error.message} onRetry={() => void stats.refetch()} />
      ) : (
        <StatsBars
          total={stats.data.total}
          rows={stats.data.variations.map((v) => ({
            key: String(v.variation),
            label: variationLabel(variations, v.variation),
            count: v.count,
          }))}
        />
      )}
    </section>
  )
}
