import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddMemberDialog } from '@/features/members/components/AddMemberDialog'
import { MemberList } from '@/features/members/components/MemberList'
import { useAddMember, useMembers } from '@/features/members/hooks/useMembers'
import { useRoles } from '@/features/roles/hooks/useRoles'

/** Container. Lists a tenant's members and adds new ones (with an optional role). */
export function MembersSettingsPage() {
  const { tenantSlug = '' } = useParams()
  const members = useMembers(tenantSlug)
  const roles = useRoles(tenantSlug)
  const addMember = useAddMember(tenantSlug)
  const [dialogOpen, setDialogOpen] = useState(false)

  const tenantRoles = (roles.data ?? []).filter((r) => r.scope === 'tenant')

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-muted-foreground text-sm">Users with access to this tenant.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Add member</Button>
      </header>

      <AddMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roles={tenantRoles}
        onAdd={(input) => addMember.mutate(input, { onSuccess: () => setDialogOpen(false) })}
        isAdding={addMember.isPending}
        errorMessage={
          addMember.isError ? 'Could not add the member — check the email exists.' : undefined
        }
      />

      {members.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : members.isError ? (
        <ErrorState message={members.error.message} onRetry={() => void members.refetch()} />
      ) : (
        <MemberList members={members.data} />
      )}
    </section>
  )
}
