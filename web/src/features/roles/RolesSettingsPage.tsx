import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { RoleList } from '@/features/roles/components/RoleList'
import { useRoles } from '@/features/roles/hooks/useRoles'

/** Container. Lists the tenant's roles. */
export function RolesSettingsPage() {
  const { tenantSlug = '' } = useParams()
  const { data: roles, isPending, isError, error, refetch } = useRoles(tenantSlug)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-muted-foreground text-sm">Permission bundles assigned to members.</p>
      </header>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <RoleList roles={roles} />
      )}
    </section>
  )
}
