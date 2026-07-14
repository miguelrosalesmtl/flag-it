import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ContextList } from '@/features/contexts/components/ContextList'
import { useContexts } from '@/features/contexts/hooks/useContexts'
import { EnvironmentTabs } from '@/features/environments/components/EnvironmentTabs'
import { useEnvironments } from '@/features/environments/hooks/useEnvironments'

/**
 * Container. Contexts seen during evaluation, per environment, with server-side
 * search. Opening a context carries the environment through as a query param.
 */
export function ContextsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const environments = useEnvironments(organizationSlug, projectKey)

  const [picked, setPicked] = useState('')
  const envKey = picked || environments.data?.[0]?.key || ''

  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const contexts = useContexts(organizationSlug, projectKey, envKey, search)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Contexts</h1>
        <p className="text-muted-foreground text-sm">
          Entities that have evaluated flags, by environment.
        </p>
      </header>

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
          <Input
            type="search"
            placeholder="Search contexts by kind or key"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {contexts.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : contexts.isError ? (
            <ErrorState message={contexts.error.message} onRetry={() => void contexts.refetch()} />
          ) : (
            <ContextList
              contexts={contexts.data}
              onOpen={(kind, key) =>
                void navigate(
                  `/organizations/${organizationSlug}/projects/${projectKey}/contexts/${encodeURIComponent(kind)}/${encodeURIComponent(key)}?env=${envKey}`,
                )
              }
            />
          )}
        </div>
      )}
    </section>
  )
}
