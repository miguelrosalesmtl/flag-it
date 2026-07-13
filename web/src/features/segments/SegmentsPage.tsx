import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentList } from '@/features/segments/components/SegmentList'
import { useSegments } from '@/features/segments/hooks/useSegments'

/** Container. Lists a project's segments. */
export function SegmentsPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const { data: segments, isPending, isError, error, refetch } = useSegments(tenantSlug, projectKey)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Segments</h1>
        <p className="text-muted-foreground text-sm">
          Reusable targeting groups that flag rules can reference.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <SegmentList segments={segments} />
      )}
    </section>
  )
}
