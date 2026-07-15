import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsBars } from '@/features/analytics/components/StatsBars'
import { useEnvStats } from '@/features/analytics/hooks/useAnalytics'
import { EnvironmentTabs } from '@/features/environments/components/EnvironmentTabs'
import { useEnvironments } from '@/features/environments/hooks/useEnvironments'
import { STATS_WINDOWS } from '@/types/analytics'

/**
 * Container. Environment-level monitoring: total evaluations and which flags are
 * being evaluated most, over a lookback window. Opening a flag goes to its detail.
 */
export function AnalyticsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const environments = useEnvironments(organizationSlug, projectKey)

  const [picked, setPicked] = useState('')
  const envKey = picked || environments.data?.[0]?.key || ''
  const [since, setSince] = useState('24h')
  const stats = useEnvStats(organizationSlug, projectKey, envKey, since)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Flag-evaluation volume by environment. Counts are rolled up from
          server-side evaluation.
        </p>
      </header>

      {environments.isPending ? (
        <Skeleton className="h-40" />
      ) : environments.isError ? (
        <ErrorState
          message={environments.error.message}
          onRetry={() => void environments.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <EnvironmentTabs
              environments={environments.data}
              selectedKey={envKey}
              onSelect={setPicked}
            />
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
            <Skeleton className="h-40" />
          ) : stats.isError ? (
            <ErrorState message={stats.error.message} onRetry={() => void stats.refetch()} />
          ) : (
            <div className="space-y-3 rounded-xl border p-4">
              <p className="text-sm font-semibold">
                {stats.data.total.toLocaleString()} evaluations
                <span className="text-muted-foreground font-normal">
                  {' '}
                  · {stats.data.flags.length} flag{stats.data.flags.length === 1 ? '' : 's'}
                </span>
              </p>
              <StatsBars
                total={stats.data.total}
                onSelect={(key) =>
                  void navigate(
                    `/organizations/${organizationSlug}/projects/${projectKey}/flags/${key}`,
                  )
                }
                rows={stats.data.flags.map((f) => ({
                  key: f.flag_key,
                  label: f.flag_key,
                  count: f.count,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
