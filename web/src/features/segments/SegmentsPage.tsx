import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateSegmentDialog } from '@/features/segments/components/CreateSegmentDialog'
import { SegmentList } from '@/features/segments/components/SegmentList'
import { useCreateSegment, useSegments } from '@/features/segments/hooks/useSegments'

/** Container. Lists a project's segments (server-side search) and creates new ones. */
export function SegmentsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const createSegment = useCreateSegment(organizationSlug, projectKey)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data: segments, isPending, isError, error, refetch } = useSegments(
    organizationSlug,
    projectKey,
    search,
  )

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Segments</h1>
          <p className="text-muted-foreground text-sm">
            Reusable targeting groups that flag rules can reference.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New segment</Button>
      </header>

      <CreateSegmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={(input) =>
          createSegment.mutate(input, {
            onSuccess: () => {
              setDialogOpen(false)
              void navigate(`/organizations/${organizationSlug}/projects/${projectKey}/segments/${input.key}`)
            },
          })
        }
        isCreating={createSegment.isPending}
        errorMessage={
          createSegment.isError
            ? 'Could not create segment — the key may already be taken.'
            : undefined
        }
      />

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
        <SegmentList
          segments={segments}
          onOpen={(key) =>
            void navigate(`/organizations/${organizationSlug}/projects/${projectKey}/segments/${key}`)
          }
        />
      )}
    </section>
  )
}
