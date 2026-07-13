import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EnvironmentTabs } from '@/features/environments/components/EnvironmentTabs'
import { useEnvironments } from '@/features/environments/hooks/useEnvironments'
import { CreateSdkKeyDialog } from '@/features/sdk-keys/components/CreateSdkKeyDialog'
import { SdkKeyList } from '@/features/sdk-keys/components/SdkKeyList'
import { useCreateSdkKey, useRevokeSdkKey, useSdkKeys } from '@/features/sdk-keys/hooks/useSdkKeys'

/**
 * Container. SDK keys are per-environment, so this shows an environment tab strip
 * and the keys for the selected one, with create + revoke.
 */
export function SdkKeysPage() {
  const { tenantSlug = '', projectKey = '' } = useParams()
  const environments = useEnvironments(tenantSlug, projectKey)

  const [picked, setPicked] = useState('')
  const envKey = picked || environments.data?.[0]?.key || ''

  const keys = useSdkKeys(tenantSlug, projectKey, envKey)
  const createKey = useCreateSdkKey(tenantSlug, projectKey, envKey)
  const revokeKey = useRevokeSdkKey(tenantSlug, projectKey, envKey)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">SDK keys</h1>
          <p className="text-muted-foreground text-sm">
            Keys SDKs use to evaluate flags in an environment.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={envKey === ''}>
          New SDK key
        </Button>
      </header>

      <CreateSdkKeyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={(input) =>
          createKey.mutate(input, { onSuccess: () => setDialogOpen(false) })
        }
        isCreating={createKey.isPending}
        errorMessage={createKey.isError ? 'Could not create the SDK key.' : undefined}
      />

      {environments.isPending ? (
        <Skeleton className="h-40" />
      ) : environments.isError ? (
        <ErrorState
          message={environments.error.message}
          onRetry={() => void environments.refetch()}
        />
      ) : (
        <div className="space-y-4">
          <EnvironmentTabs
            environments={environments.data}
            selectedKey={envKey}
            onSelect={setPicked}
          />
          {keys.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : keys.isError ? (
            <ErrorState message={keys.error.message} onRetry={() => void keys.refetch()} />
          ) : (
            <SdkKeyList
              keys={keys.data}
              onRevoke={(id) => revokeKey.mutate(id)}
              revokingId={revokeKey.isPending ? revokeKey.variables : null}
            />
          )}
        </div>
      )}
    </section>
  )
}
