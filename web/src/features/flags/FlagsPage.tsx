import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { FlagList } from '@/features/flags/components/FlagList'
import { useFlags } from '@/features/flags/hooks/useFlags'
import { useProject } from '@/features/projects/hooks/useProjects'

/**
 * Container. Lists a project's flag definitions. The project name comes from its
 * own query so the header reads well even on a deep-linked load.
 */
export function FlagsPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const project = useProject(tenantSlug, projectKey)
  const { data: flags, isPending, isError, error, refetch } = useFlags(tenantSlug, projectKey)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Link
          to={`/tenants/${tenantSlug}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Projects
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.data?.name ?? 'Flags'}
        </h1>
        <p className="text-muted-foreground text-sm">
          Flags in <span className="font-mono">{projectKey}</span>.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <FlagList flags={flags} />
      )}
    </section>
  )
}
