import type { Meta, StoryObj } from '@storybook/react-vite'

import { WebhookDeliveries } from '@/features/webhooks/components/WebhookDeliveries'
import type { WebhookDelivery } from '@/types/webhook'

const deliveries: WebhookDelivery[] = [
  { id: 'd1', webhook_id: 'w1', event_type: 'flag.config.patched', status: 'success', attempts: 1, response_status: 200, next_attempt_at: '2026-07-13T12:00:00Z', created_at: '2026-07-13T12:00:00Z', delivered_at: '2026-07-13T12:00:01Z' },
  { id: 'd2', webhook_id: 'w1', event_type: 'change.approved', status: 'failed', attempts: 5, response_status: 500, error: 'status 500', next_attempt_at: '2026-07-13T11:00:00Z', created_at: '2026-07-13T11:00:00Z' },
]

const meta = {
  title: 'Webhooks/WebhookDeliveries',
  component: WebhookDeliveries,
  args: { deliveries },
} satisfies Meta<typeof WebhookDeliveries>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { deliveries: [] } }
