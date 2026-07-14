import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AddMemberDialog } from '@/features/members/components/AddMemberDialog'
import { GrantProjectRoleDialog } from '@/features/members/components/GrantProjectRoleDialog'
import { MemberList } from '@/features/members/components/MemberList'
import { useAddMember, useGrantProjectRole, useMembers } from '@/features/members/hooks/useMembers'
import { useRoles } from '@/features/roles/hooks/useRoles'

/** Container. Lists a organization's members and adds new ones (with an optional role). */
export function MembersSettingsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()
  const members = useMembers(organizationSlug)
  const roles = useRoles(organizationSlug)
  const addMember = useAddMember(organizationSlug)
  const grantRole = useGrantProjectRole(organizationSlug, projectKey)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const organizationRoles = (roles.data ?? []).filter((r) => r.scope === 'organization')
  const projectRoles = (roles.data ?? []).filter((r) => r.scope === 'project')

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-muted-foreground text-sm">Users with access to this organization.</p>
        </div>
        <div className="flex gap-2">
          <GrantProjectRoleDialog
            projectKey={projectKey}
            roles={projectRoles}
            onGrant={(input) =>
              grantRole.mutate(input, {
                onSuccess: () => setNotice(`Granted ${input.email} the ${input.role} role on ${projectKey}.`),
              })
            }
            isGranting={grantRole.isPending}
            errorMessage={grantRole.isError ? 'Could not grant the role — check the email exists.' : undefined}
          />
          <Button onClick={() => setDialogOpen(true)}>Add member</Button>
        </div>
      </header>

      {notice ? <p className="text-muted-foreground text-sm">{notice}</p> : null}

      <AddMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roles={organizationRoles}
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
