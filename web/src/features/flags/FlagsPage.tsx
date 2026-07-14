import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EnvironmentTabs } from '@/features/environments/components/EnvironmentTabs'
import { useEnvironments } from '@/features/environments/hooks/useEnvironments'
import { CreateFlagDialog } from '@/features/flags/components/CreateFlagDialog'
import { FlagList } from '@/features/flags/components/FlagList'
import { useCreateFlag, useEnvFlags, useToggleEnvFlag } from '@/features/flags/hooks/useFlags'

/**
 * Container. A project's flags, shown for a selected environment: each row has
 * an inline on/off switch that toggles the flag in that environment. Search is
 * server-side (debounced), so the list scales past what a client can hold.
 */
export function FlagsPage() {
  const { organizationSlug = '', projectKey = '' } = useParams()
  const navigate = useNavigate()
  const environments = useEnvironments(organizationSlug, projectKey)
  const createFlag = useCreateFlag(organizationSlug, projectKey)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Default to the first environment until the user picks another.
  const [picked, setPicked] = useState('')
  const envKey = picked || environments.data?.[0]?.key || ''

  // Debounce the search box, then send it to the server as a query.
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const flags = useEnvFlags(organizationSlug, projectKey, envKey, search)
  const toggle = useToggleEnvFlag(organizationSlug, projectKey, envKey)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Flags</h1>
        <Button onClick={() => setDialogOpen(true)}>New flag</Button>
      </header>

      <CreateFlagDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={(input) =>
          createFlag.mutate(input, {
            onSuccess: (flag) => {
              setDialogOpen(false)
              void navigate(`/organizations/${organizationSlug}/projects/${projectKey}/flags/${flag.key}`)
            },
          })
        }
        isCreating={createFlag.isPending}
        errorMessage={
          createFlag.isError ? 'Could not create flag — the key may already be taken.' : undefined
        }
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

          {/* Show search whenever the project has flags (or a search is active). */}
          {flags.data && (flags.data.length > 0 || search) ? (
            <Input
              type="search"
              placeholder="Search flags by name, key, or description"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          ) : null}

          {flags.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : flags.isError ? (
            <ErrorState message={flags.error.message} onRetry={() => void flags.refetch()} />
          ) : flags.data.length === 0 && search ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
              No flags match “{search}”.
            </p>
          ) : (
            <FlagList
              flags={flags.data}
              onOpen={(key) =>
                void navigate(`/organizations/${organizationSlug}/projects/${projectKey}/flags/${key}`)
              }
              onToggle={(flagKey, on) => toggle.mutate({ flagKey, on })}
              togglingKey={toggle.isPending ? toggle.variables.flagKey : null}
            />
          )}
        </div>
      )}
    </section>
  )
}
