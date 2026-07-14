import { Link, useParams, useSearchParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExpectedVariationsTable } from '@/features/contexts/components/ExpectedVariationsTable'
import { useContext } from '@/features/contexts/hooks/useContexts'

/**
 * Container. A context's attributes and how every flag evaluates for it. The
 * environment comes from the ?env= query param the list navigates with.
 */
export function ContextDetailPage() {
  const { organizationSlug = '', projectKey = '', kind = '', key = '' } = useParams()
  const [searchParams] = useSearchParams()
  const envKey = searchParams.get('env') ?? ''

  const detail = useContext(organizationSlug, projectKey, envKey, kind, key)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Link
          to={`/organizations/${organizationSlug}/projects/${projectKey}/contexts`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Contexts
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{kind}</Badge>
          <h1 className="font-mono text-xl font-semibold tracking-tight">{key}</h1>
        </div>
      </header>

      {detail.isPending ? (
        <Skeleton className="h-64" />
      ) : detail.isError ? (
        <ErrorState message={detail.error.message} onRetry={() => void detail.refetch()} />
      ) : (
        <div className="space-y-6">
          <section className="space-y-2 rounded-xl border p-4">
            <h2 className="text-sm font-semibold">Attributes</h2>
            <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
              {JSON.stringify(detail.data.context.attributes, null, 2)}
            </pre>
          </section>

          <section className="space-y-3 rounded-xl border p-4">
            <h2 className="text-sm font-semibold">Expected variations</h2>
            <ExpectedVariationsTable evaluations={detail.data.evaluations} />
          </section>
        </div>
      )}
    </section>
  )
}
