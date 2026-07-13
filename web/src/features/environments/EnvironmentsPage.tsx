import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateEnvironmentDialog } from '@/features/environments/components/CreateEnvironmentDialog'
import { EnvironmentList } from '@/features/environments/components/EnvironmentList'
import { useCreateEnvironment, useEnvironments } from '@/features/environments/hooks/useEnvironments'

/** Container. Lists a project's environments and creates new ones. */
export function EnvironmentsPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const { data: environments, isPending, isError, error, refetch } = useEnvironments(
    tenantSlug,
    projectKey,
  )
  const createEnvironment = useCreateEnvironment(tenantSlug, projectKey)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Environments</h1>
          <p className="text-muted-foreground text-sm">
            Each environment has its own flag configuration and SDK keys.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New environment</Button>
      </header>

      <CreateEnvironmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={(input) =>
          createEnvironment.mutate(input, { onSuccess: () => setDialogOpen(false) })
        }
        isCreating={createEnvironment.isPending}
        errorMessage={
          createEnvironment.isError
            ? 'Could not create environment — the key may already be taken.'
            : undefined
        }
      />

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <EnvironmentList environments={environments} />
      )}
    </section>
  )
}
