import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateFlagDialog } from '@/features/flags/components/CreateFlagDialog'
import { FlagList } from '@/features/flags/components/FlagList'
import { useCreateFlag, useFlags } from '@/features/flags/hooks/useFlags'
import { useProject } from '@/features/projects/hooks/useProjects'

/**
 * Container. Lists a project's flag definitions. The project name comes from its
 * own query so the header reads well even on a deep-linked load.
 */
export function FlagsPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const project = useProject(tenantSlug, projectKey)
  const { data: flags, isPending, isError, error, refetch } = useFlags(tenantSlug, projectKey)
  const createFlag = useCreateFlag(tenantSlug, projectKey)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
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
        </div>
        <Button onClick={() => setDialogOpen(true)}>New flag</Button>
      </header>

      <CreateFlagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={(input) =>
          createFlag.mutate(input, {
            onSuccess: (flag) => {
              setDialogOpen(false)
              void navigate(`/tenants/${tenantSlug}/projects/${projectKey}/flags/${flag.key}`)
            },
          })
        }
        isCreating={createFlag.isPending}
        errorMessage={
          createFlag.isError ? 'Could not create flag — the key may already be taken.' : undefined
        }
      />

      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      ) : (
        <FlagList
          flags={flags}
          onOpen={(key) =>
            void navigate(`/tenants/${tenantSlug}/projects/${projectKey}/flags/${key}`)
          }
        />
      )}
    </section>
  )
}
