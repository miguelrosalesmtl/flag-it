import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateWebhookDialog } from '@/features/webhooks/components/CreateWebhookDialog'
import { WebhookList } from '@/features/webhooks/components/WebhookList'
import {
  useCreateWebhook,
  useDeleteWebhook,
  useResetWebhookSecret,
  useSetWebhookEnabled,
  useTestWebhook,
  useWebhooks,
} from '@/features/webhooks/hooks/useWebhooks'

/**
 * Container. A tenant's outbound webhooks (settings → integrations): register
 * URLs, pick events, and manage delivery. Signing secrets are revealed once.
 */
export function WebhooksSettingsPage() {
  const { tenantSlug = '' } = useParams()
  const webhooks = useWebhooks(tenantSlug)
  const create = useCreateWebhook(tenantSlug)
  const setEnabled = useSetWebhookEnabled(tenantSlug)
  const reset = useResetWebhookSecret(tenantSlug)
  const test = useTestWebhook(tenantSlug)
  const remove = useDeleteWebhook(tenantSlug)

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground text-sm">
            Receive signed POSTs when events happen in this tenant.
          </p>
        </div>
        <CreateWebhookDialog
          onCreate={(input) =>
            create.mutate(input, {
              onSuccess: (w) => {
                setNotice(null)
                setRevealedSecret(w.secret ?? null)
              },
            })
          }
          isSubmitting={create.isPending}
        />
      </header>

      {webhooks.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : webhooks.isError ? (
        <ErrorState message={webhooks.error.message} onRetry={() => void webhooks.refetch()} />
      ) : (
        <WebhookList
          webhooks={webhooks.data}
          revealedSecret={revealedSecret}
          onDismissSecret={() => setRevealedSecret(null)}
          notice={notice}
          onToggleEnabled={(id, enabled) => setEnabled.mutate({ id, enabled })}
          onTest={(id) =>
            test.mutate(id, {
              onSuccess: () => setNotice('Test event queued — it will be delivered shortly.'),
            })
          }
          onReset={(id) =>
            reset.mutate(id, {
              onSuccess: (w) => {
                setNotice(null)
                setRevealedSecret(w.secret ?? null)
              },
            })
          }
          onDelete={(id) => remove.mutate(id)}
          busy={setEnabled.isPending || reset.isPending || remove.isPending || test.isPending}
        />
      )}
    </section>
  )
}
