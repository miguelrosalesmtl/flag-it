import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FlagLifecycleList } from '@/features/flags/components/FlagLifecycleList'
import { useFlagLifecycle } from '@/features/flags/hooks/useFlags'

type Filter = 'all' | 'stale' | 'temporary'

/**
 * Container. A project's flags by lifecycle status, for spotting stale flags to
 * clean up. Filter to stale (inactive) or temporary; open a flag to act on it.
 */
export function LifecyclePage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const lifecycle = useFlagLifecycle(tenantSlug, projectKey)
  const [filter, setFilter] = useState<Filter>('all')

  const flags = (lifecycle.data ?? []).filter((f) => {
    if (filter === 'stale') return f.status === 'inactive'
    if (filter === 'temporary') return f.temporary
    return true
  })

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Flag lifecycle</h1>
        <p className="text-muted-foreground text-sm">
          Flags by activity. Stale flags — not evaluated recently — are cleanup candidates,
          especially temporary ones.
        </p>
      </header>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="stale">Stale</TabsTrigger>
          <TabsTrigger value="temporary">Temporary</TabsTrigger>
        </TabsList>
      </Tabs>

      {lifecycle.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : lifecycle.isError ? (
        <ErrorState message={lifecycle.error.message} onRetry={() => void lifecycle.refetch()} />
      ) : (
        <FlagLifecycleList
          flags={flags}
          onOpen={(key) =>
            void navigate(`/tenants/${tenantSlug}/projects/${projectKey}/flags/${key}`)
          }
        />
      )}
    </section>
  )
}
