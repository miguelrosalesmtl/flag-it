import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useProject, useUpdateProject } from '@/features/projects/hooks/useProjects'
import { ProjectGeneralForm } from '@/features/settings/components/ProjectGeneralForm'

/** Container. Project general settings — rename the project (the key is immutable). */
export function GeneralSettingsPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const project = useProject(tenantSlug, projectKey)
  const update = useUpdateProject(tenantSlug, projectKey)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">General</h1>
        <p className="text-muted-foreground text-sm">Project settings.</p>
      </header>

      {project.isPending ? (
        <Skeleton className="h-40" />
      ) : project.isError ? (
        <ErrorState message={project.error.message} onRetry={() => void project.refetch()} />
      ) : (
        <ProjectGeneralForm
          key={project.data.updated_at}
          project={project.data}
          onSave={(name) => update.mutate(name)}
          isSaving={update.isPending}
        />
      )}
    </section>
  )
}
