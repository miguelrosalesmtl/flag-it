import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateEnvironmentDialog } from '@/features/environments/components/CreateEnvironmentDialog'
import { EnvironmentList } from '@/features/environments/components/EnvironmentList'
import { useCreateEnvironment, useEnvironments } from '@/features/environments/hooks/useEnvironments'

/** Container. Lists a project's environments (server-side search) and creates new ones. */
export function EnvironmentsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data: environments, isPending, isError, error, refetch } = useEnvironments(
    organizationSlug,
    projectKey,
    search,
  )
  const createEnvironment = useCreateEnvironment(organizationSlug, projectKey)
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

      {environments && (environments.length > 0 || search) ? (
        <Input
          type="search"
          placeholder="Search environments by name or key"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      ) : null}

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : environments.length === 0 && search ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          No environments match “{search}”.
        </p>
      ) : (
        <EnvironmentList environments={environments} />
      )}
    </section>
  )
}
