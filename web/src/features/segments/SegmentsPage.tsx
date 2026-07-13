import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentList } from '@/features/segments/components/SegmentList'
import { useSegments } from '@/features/segments/hooks/useSegments'

/** Container. Lists a project's segments, with server-side search. */
export function SegmentsPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data: segments, isPending, isError, error, refetch } = useSegments(
    tenantSlug,
    projectKey,
    search,
  )

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Segments</h1>
        <p className="text-muted-foreground text-sm">
          Reusable targeting groups that flag rules can reference.
        </p>
      </header>

      {segments && (segments.length > 0 || search) ? (
        <Input
          type="search"
          placeholder="Search segments by name, key, or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      ) : null}

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : segments.length === 0 && search ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No segments match “{search}”.
        </p>
      ) : (
        <SegmentList segments={segments} />
      )}
    </section>
  )
}
