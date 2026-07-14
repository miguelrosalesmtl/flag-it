import { Link, useNavigate, useParams } from 'react-router'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { SegmentEditor } from '@/features/segments/components/SegmentEditor'
import { useDeleteSegment, useSaveSegment, useSegment } from '@/features/segments/hooks/useSegments'

/**
 * Container. A segment's definition: individually included/excluded context keys
 * (editable) and its rules (read-only for now). Saving PUTs the full segment.
 */
export function SegmentDetailPage() {
  const { organizationSlug = '', projectKey = '', segKey = '' } = useParams()
  const navigate = useNavigate()
  const segment = useSegment(organizationSlug, projectKey, segKey)
  const save = useSaveSegment(organizationSlug, projectKey, segKey)
  const deleteSegment = useDeleteSegment(organizationSlug, projectKey)

  const segmentsUrl = `/organizations/${organizationSlug}/projects/${projectKey}/segments`

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link to={segmentsUrl} className="text-muted-foreground text-sm hover:underline">
            ← Segments
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {segment.data?.name ?? segKey}
          </h1>
          {segment.data?.description ? (
            <p className="text-muted-foreground text-sm">{segment.data.description}</p>
          ) : null}
        </div>
        <ConfirmDeleteDialog
          triggerLabel="Delete segment"
          title={`Delete ${segment.data?.name ?? segKey}?`}
          description="Flags referencing this segment will no longer match it. This cannot be undone."
          confirmLabel="Delete segment"
          busy={deleteSegment.isPending}
          onConfirm={() =>
            deleteSegment.mutate(segKey, { onSuccess: () => void navigate(segmentsUrl) })
          }
        />
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
