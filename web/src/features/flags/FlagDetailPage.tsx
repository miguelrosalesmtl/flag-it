import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { EnvironmentTabs } from '@/features/environments/components/EnvironmentTabs'
import { FlagConfigCard } from '@/features/flags/components/FlagConfigCard'
import { useFlag, useFlagConfig, useToggleFlag } from '@/features/flags/hooks/useFlags'
import { useEnvironments } from '@/features/environments/hooks/useEnvironments'

/**
 * Container. A flag's per-environment configuration: pick an environment, see
 * its on/off state, and flip it. The toggle drives the semantic-instruction
 * PATCH (turnFlagOn/turnFlagOff) on the backend.
 */
export function FlagDetailPage() {
  const { tenantSlug = '', projectKey = '', flagKey = '' } = useParams()
  const flag = useFlag(tenantSlug, projectKey, flagKey)
  const environments = useEnvironments(tenantSlug, projectKey)
  const toggle = useToggleFlag(tenantSlug, projectKey, flagKey)

  // Default to the first environment until the user picks another. Derived, so
  // no effect is needed to seed it once the list loads.
  const [picked, setPicked] = useState('')
  const envKey = picked || environments.data?.[0]?.key || ''
  const config = useFlagConfig(tenantSlug, projectKey, flagKey, envKey)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <Link
          to={`/tenants/${tenantSlug}/projects/${projectKey}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Flags
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{flag.data?.name ?? flagKey}</h1>
        <p className="text-muted-foreground font-mono text-sm">{flagKey}</p>
      </header>

      {flag.isPending || environments.isPending ? (
        <Skeleton className="h-40" />
      ) : flag.isError ? (
        <ErrorState message={flag.error.message} onRetry={() => void flag.refetch()} />
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
          {config.isPending ? (
            <Skeleton className="h-40" />
          ) : config.isError ? (
            <ErrorState message={config.error.message} onRetry={() => void config.refetch()} />
          ) : (
            <FlagConfigCard
              flag={flag.data}
              config={config.data}
              onToggle={(on) => toggle.mutate({ envKey, on })}
              isToggling={toggle.isPending}
            />
          )}
        </div>
      )}
    </section>
  )
}
