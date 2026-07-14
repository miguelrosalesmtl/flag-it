import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { EnvironmentTabs } from '@/features/environments/components/EnvironmentTabs'
import { FlagConfigCard } from '@/features/flags/components/FlagConfigCard'
import { FlagRules } from '@/features/flags/components/FlagRules'
import { FlagTargeting } from '@/features/flags/components/FlagTargeting'
import { RequestChangeDialog } from '@/features/flags/components/RequestChangeDialog'
import { ScheduleChangeDialog } from '@/features/flags/components/ScheduleChangeDialog'
import { ScheduledChangesCard } from '@/features/flags/components/ScheduledChangesCard'
import { CreateTriggerDialog } from '@/features/flags/components/CreateTriggerDialog'
import { TriggersCard } from '@/features/flags/components/TriggersCard'
import { useCreateChange } from '@/features/approvals/hooks/useChanges'
import {
  useDeleteFlag,
  useFlag,
  useFlagConfig,
  usePatchFlagConfig,
  useToggleFlag,
} from '@/features/flags/hooks/useFlags'
import {
  useCancelScheduledChange,
  useCreateScheduledChange,
  useScheduledChanges,
} from '@/features/flags/hooks/useScheduledChanges'
import {
  useCreateTrigger,
  useDeleteTrigger,
  useResetTrigger,
  useSetTriggerEnabled,
  useTriggers,
} from '@/features/flags/hooks/useTriggers'
import { useEnvironments } from '@/features/environments/hooks/useEnvironments'

/**
 * Container. A flag's per-environment configuration: pick an environment, see
 * its on/off state, and flip it. The toggle drives the semantic-instruction
 * PATCH (turnFlagOn/turnFlagOff) on the backend.
 */
export function FlagDetailPage() {
  const { tenantSlug = '', projectKey = '', flagKey = '' } = useParams()
  const navigate = useNavigate()
  const flag = useFlag(tenantSlug, projectKey, flagKey)
  const environments = useEnvironments(tenantSlug, projectKey)
  const toggle = useToggleFlag(tenantSlug, projectKey, flagKey)

  // Default to the first environment until the user picks another. Derived, so
  // no effect is needed to seed it once the list loads.
  const [picked, setPicked] = useState('')
  const envKey = picked || environments.data?.[0]?.key || ''
  const config = useFlagConfig(tenantSlug, projectKey, flagKey, envKey)
  const patch = usePatchFlagConfig(tenantSlug, projectKey, flagKey, envKey)
  const requestChange = useCreateChange(tenantSlug, projectKey, flagKey, envKey)
  const scheduledChanges = useScheduledChanges(tenantSlug, projectKey, flagKey, envKey)
  const scheduleChange = useCreateScheduledChange(tenantSlug, projectKey, flagKey, envKey)
  const cancelScheduled = useCancelScheduledChange(tenantSlug, projectKey)

  const triggers = useTriggers(tenantSlug, projectKey, flagKey, envKey)
  const createTrigger = useCreateTrigger(tenantSlug, projectKey, flagKey, envKey)
  const setTriggerEnabled = useSetTriggerEnabled(tenantSlug, projectKey)
  const resetTrigger = useResetTrigger(tenantSlug, projectKey)
  const deleteTrigger = useDeleteTrigger(tenantSlug, projectKey)
  const deleteFlag = useDeleteFlag(tenantSlug, projectKey)
  // A just-minted webhook URL to reveal once (create/reset return it).
  const [revealedUrl, setRevealedUrl] = useState<string | null>(null)

  const flagsUrl = `/tenants/${tenantSlug}/projects/${projectKey}`

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link to={flagsUrl} className="text-muted-foreground text-sm hover:underline">
            ← Flags
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{flag.data?.name ?? flagKey}</h1>
          <p className="text-muted-foreground font-mono text-sm">{flagKey}</p>
        </div>
        <ConfirmDeleteDialog
          triggerLabel="Delete flag"
          title={`Delete ${flag.data?.name ?? flagKey}?`}
          description="This removes the flag and its configuration in every environment. This cannot be undone."
          confirmLabel="Delete flag"
          busy={deleteFlag.isPending}
          onConfirm={() =>
            deleteFlag.mutate(flagKey, { onSuccess: () => void navigate(flagsUrl) })
          }
        />
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
            <>
              <div className="flex justify-end gap-2">
                <CreateTriggerDialog
                  envKey={envKey}
                  onCreate={(action, description) =>
                    createTrigger.mutate(
                      { action, description },
                      { onSuccess: (t) => setRevealedUrl(t.url ?? null) },
                    )
                  }
                  isSubmitting={createTrigger.isPending}
                />
                <ScheduleChangeDialog
                  currentOn={config.data.on}
                  envKey={envKey}
                  onSubmit={(instructions, scheduledFor, comment) =>
                    scheduleChange.mutate({ instructions, scheduled_for: scheduledFor, comment })
                  }
                  isSubmitting={scheduleChange.isPending}
                />
                <RequestChangeDialog
                  currentOn={config.data.on}
                  envKey={envKey}
                  onSubmit={(instructions, comment) =>
                    requestChange.mutate({ instructions, comment })
                  }
                  isSubmitting={requestChange.isPending}
                />
              </div>
              <FlagConfigCard
                flag={flag.data}
                config={config.data}
                onToggle={(on) => toggle.mutate({ envKey, on })}
                isToggling={toggle.isPending}
              />
              <FlagTargeting
                flag={flag.data}
                config={config.data}
                onSetFallthrough={(v) =>
                  patch.mutate([{ kind: 'updateFallthroughVariation', variation: v }])
                }
                onSetOffVariation={(v) =>
                  patch.mutate([{ kind: 'updateOffVariation', variation: v }])
                }
                onAddTarget={(variation, key) =>
                  patch.mutate([
                    { kind: 'addTargets', contextKind: 'user', variation, values: [key] },
                  ])
                }
                onRemoveTarget={(variation, key) =>
                  patch.mutate([
                    { kind: 'removeTargets', contextKind: 'user', variation, values: [key] },
                  ])
                }
                busy={patch.isPending}
              />
              <section className="space-y-3 rounded-xl border p-4">
                <h2 className="text-sm font-semibold">Targeting rules</h2>
                <p className="text-muted-foreground text-sm">
                  When on, contexts matching a rule get its variation (rules are checked in order,
                  before the default).
                </p>
                <FlagRules
                  flag={flag.data}
                  rules={config.data.rules}
                  onAddRule={(clauses, served) =>
                    patch.mutate([
                      { kind: 'addRule', clauses, variation: served.variation, rollout: served.rollout },
                    ])
                  }
                  onUpdateRule={(ruleId, clauses, served) =>
                    patch.mutate([
                      { kind: 'updateRule', ruleId, clauses, variation: served.variation, rollout: served.rollout },
                    ])
                  }
                  onRemoveRule={(ruleId) => patch.mutate([{ kind: 'removeRule', ruleId }])}
                  onReorderRules={(ruleIds) => patch.mutate([{ kind: 'reorderRules', ruleIds }])}
                  busy={patch.isPending}
                />
              </section>
              {scheduledChanges.data ? (
                <ScheduledChangesCard
                  changes={scheduledChanges.data}
                  onCancel={(id) => cancelScheduled.mutate(id)}
                  busy={cancelScheduled.isPending}
                />
              ) : null}
              {triggers.data ? (
                <TriggersCard
                  triggers={triggers.data}
                  revealedUrl={revealedUrl}
                  onDismissUrl={() => setRevealedUrl(null)}
                  onToggleEnabled={(id, enabled) => setTriggerEnabled.mutate({ id, enabled })}
                  onReset={(id) =>
                    resetTrigger.mutate(id, { onSuccess: (t) => setRevealedUrl(t.url ?? null) })
                  }
                  onDelete={(id) => deleteTrigger.mutate(id)}
                  busy={
                    setTriggerEnabled.isPending ||
                    resetTrigger.isPending ||
                    deleteTrigger.isPending
                  }
                />
              ) : null}
            </>
          )}
        </div>
      )}
    </section>
  )
}
