import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateUserDialog } from '@/features/users/components/CreateUserDialog'
import { UserList } from '@/features/users/components/UserList'
import { useCreateUser, useDeleteUser, useUsers } from '@/features/users/hooks/useUsers'

/**
 * Container. Platform user administration (superuser only): list users, create
 * accounts, and delete them.
 */
export function UsersPage() {
  const users = useUsers()
  const create = useCreateUser()
  const remove = useDeleteUser()

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">Platform accounts across all organizations.</p>
        </div>
        <CreateUserDialog
          onCreate={(input) => create.mutate(input)}
          isCreating={create.isPending}
          errorMessage={create.isError ? 'Could not create the user.' : undefined}
        />
      </header>

      {users.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : users.isError ? (
        <ErrorState message={users.error.message} onRetry={() => void users.refetch()} />
      ) : (
        <UserList
          users={users.data}
          onDelete={(id) => remove.mutate(id)}
          busy={remove.isPending}
        />
      )}
    </section>
  )
}
