import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentEditor } from '@/features/segments/components/SegmentEditor'
import { useSaveSegment, useSegment } from '@/features/segments/hooks/useSegments'

/**
 * Container. A segment's definition: individually included/excluded context keys
 * (editable) and its rules (read-only for now). Saving PUTs the full segment.
 */
export function SegmentDetailPage() {
  const { tenantSlug = '', projectKey = '', segKey = '' } = useParams()
  const segment = useSegment(tenantSlug, projectKey, segKey)
  const save = useSaveSegment(tenantSlug, projectKey, segKey)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Link
          to={`/tenants/${tenantSlug}/projects/${projectKey}/segments`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Segments
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {segment.data?.name ?? segKey}
        </h1>
        {segment.data?.description ? (
          <p className="text-muted-foreground text-sm">{segment.data.description}</p>
        ) : null}
      </header>

      {segment.isPending ? (
        <Skeleton className="h-64" />
      ) : segment.isError ? (
        <ErrorState message={segment.error.message} onRetry={() => void segment.refetch()} />
      ) : (
        <SegmentEditor
          // Re-seed the editor's local state whenever a save bumps the version.
          key={segment.data.version}
          segment={segment.data}
          onSave={(body) => save.mutate(body)}
          isSaving={save.isPending}
          errorMessage={save.isError ? 'Could not save the segment.' : undefined}
        />
      )}
    </section>
  )
}
