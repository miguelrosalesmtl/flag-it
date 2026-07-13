import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateRoleDialog } from '@/features/roles/components/CreateRoleDialog'
import { RoleList } from '@/features/roles/components/RoleList'
import { useCreateRole, usePermissions, useRoles } from '@/features/roles/hooks/useRoles'

/** Container. Lists the tenant's roles and creates custom ones. */
export function RolesSettingsPage() {
  const { tenantSlug = '' } = useParams()
  const { data: roles, isPending, isError, error, refetch } = useRoles(tenantSlug)
  const permissions = usePermissions()
  const createRole = useCreateRole(tenantSlug)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-muted-foreground text-sm">Permission bundles assigned to members.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New role</Button>
      </header>

      <CreateRoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        permissions={permissions.data ?? []}
        onCreate={(input) => createRole.mutate(input, { onSuccess: () => setDialogOpen(false) })}
        isCreating={createRole.isPending}
        errorMessage={
          createRole.isError ? 'Could not create the role — the key may already be taken.' : undefined
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
        <RoleList roles={roles} />
      )}
    </section>
  )
}
