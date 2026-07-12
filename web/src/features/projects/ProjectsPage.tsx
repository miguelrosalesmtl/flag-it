import { Link, useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectList } from '@/features/projects/components/ProjectList'
import { useProjects } from '@/features/projects/hooks/useProjects'

/**
 * Container. Lists the projects in the tenant named by the route, and opens a
 * project's flags when a row is clicked.
 */
export function ProjectsPage() {
  const { tenantSlug = '' } = useParams()
  const navigate = useNavigate()
  const { data: projects, isPending, isError, error, refetch } = useProjects(tenantSlug)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Link to="/" className="text-muted-foreground text-sm hover:underline">
          ← Tenants
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground text-sm">
          Projects in <span className="font-mono">{tenantSlug}</span>.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <ProjectList
          projects={projects}
          onOpen={(key) => void navigate(`/tenants/${tenantSlug}/projects/${key}`)}
        />
      )}
    </section>
  )
}
