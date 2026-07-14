import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateWebhookDialog } from '@/features/webhooks/components/CreateWebhookDialog'
import { WebhookDeliveries } from '@/features/webhooks/components/WebhookDeliveries'
import { WebhookList } from '@/features/webhooks/components/WebhookList'
import {
  useCreateWebhook,
  useDeleteWebhook,
  useResetWebhookSecret,
  useSetWebhookEnabled,
  useTestWebhook,
  useWebhookDeliveries,
  useWebhooks,
} from '@/features/webhooks/hooks/useWebhooks'

/**
 * Container. A organization's outbound webhooks (settings → integrations): register
 * URLs, pick events, and manage delivery. Signing secrets are revealed once.
 */
export function WebhooksSettingsPage() {
  const { organizationSlug = '' } = useParams()
  const webhooks = useWebhooks(organizationSlug)
  const create = useCreateWebhook(organizationSlug)
  const setEnabled = useSetWebhookEnabled(organizationSlug)
  const reset = useResetWebhookSecret(organizationSlug)
  const test = useTestWebhook(organizationSlug)
  const remove = useDeleteWebhook(organizationSlug)

  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deliveriesFor, setDeliveriesFor] = useState<string | null>(null)
  const deliveries = useWebhookDeliveries(organizationSlug, deliveriesFor ?? '', deliveriesFor !== null)

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground text-sm">
            Receive signed POSTs when events happen in this organization.
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
          onViewDeliveries={(id) => setDeliveriesFor(id)}
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

      <Dialog open={deliveriesFor !== null} onOpenChange={(open) => !open && setDeliveriesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recent deliveries</DialogTitle>
          </DialogHeader>
          {deliveries.isPending ? (
            <Skeleton className="h-24" />
          ) : deliveries.isError ? (
            <ErrorState
              message={deliveries.error.message}
              onRetry={() => void deliveries.refetch()}
            />
          ) : (
            <WebhookDeliveries deliveries={deliveries.data ?? []} />
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
