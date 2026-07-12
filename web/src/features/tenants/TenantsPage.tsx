import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { TenantList } from '@/features/tenants/components/TenantList'
import { useTenants } from '@/features/tenants/hooks/useTenants'

/**
 * Container. The first authenticated screen: lists the tenants the signed-in
 * user can see. Branches on load/error so the list component only ever receives
 * resolved data.
 */
export function TenantsPage() {
  const { data: tenants, isPending, isError, error, refetch } = useTenants()

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
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
        <TenantList tenants={tenants} />
      )}
    </section>
  )
}
