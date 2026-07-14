import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChangeRequestList } from '@/features/approvals/components/ChangeRequestList'
import { useChanges, useReviewChange } from '@/features/approvals/hooks/useChanges'
import type { ChangeStatus } from '@/types/change'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

/**
 * Container. A project's change requests (approval workflow). Filter by status;
 * approve/reject pending requests — approving applies the change on the backend.
 */
export function ApprovalsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()
  const [filter, setFilter] = useState<Filter>('pending')
  const status: ChangeStatus | undefined = filter === 'all' ? undefined : filter
  const changes = useChanges(organizationSlug, projectKey, status)
  const review = useReviewChange(organizationSlug, projectKey)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground text-sm">
          Proposed flag changes awaiting review. Approving a request applies it.
        </p>
      </header>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {changes.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : changes.isError ? (
        <ErrorState message={changes.error.message} onRetry={() => void changes.refetch()} />
      ) : (
        <ChangeRequestList
          changes={changes.data}
          onReview={(id, action) => review.mutate({ id, action })}
          busy={review.isPending}
        />
      )}
    </section>
  )
}
