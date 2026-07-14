import { useNavigate } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { OrganizationList } from '@/features/organizations/components/OrganizationList'
import { useDeleteOrganization, useOrganizations } from '@/features/organizations/hooks/useOrganizations'

/**
 * Container. The first authenticated screen: lists the organizations the signed-in
 * user can see. Branches on load/error so the list component only ever receives
 * resolved data.
 */
export function OrganizationsPage() {
  const navigate = useNavigate()
  const { data: organizations, isPending, isError, error, refetch } = useOrganizations()
  const deleteOrganization = useDeleteOrganization()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground text-sm">Organizations you have access to.</p>
      </header>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <OrganizationList
          organizations={organizations}
          onOpen={(slug) => void navigate(`/organizations/${slug}`)}
          onDelete={(slug) => deleteOrganization.mutate(slug)}
          busy={deleteOrganization.isPending}
        />
      )}
    </section>
  )
}
