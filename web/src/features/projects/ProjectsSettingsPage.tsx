import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectList } from '@/features/projects/components/ProjectList'
import { useDeleteProject, useProjects } from '@/features/projects/hooks/useProjects'

/** Container. The tenant's projects, in settings. Opening one goes to its flags. */
export function ProjectsSettingsPage() {
  const { tenantSlug = '' } = useParams()
  const navigate = useNavigate()
  const { data: projects, isPending, isError, error, refetch } = useProjects(tenantSlug)
  const deleteProject = useDeleteProject(tenantSlug)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-muted-foreground text-sm">Applications in this tenant.</p>
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
          onDelete={(key) => deleteProject.mutate(key)}
          busy={deleteProject.isPending}
        />
      )}
    </section>
  )
}
