import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { WebhookList } from '@/features/webhooks/components/WebhookList'
import type { Webhook } from '@/types/webhook'

const base: Omit<Webhook, 'id' | 'enabled' | 'event_types' | 'url'> = {
  organization_id: 't1',
  description: 'Slack notifications',
  created_by: 'u1',
  created_by_email: 'ada@example.com',
  created_at: '2026-07-13T09:00:00Z',
}

const webhooks: Webhook[] = [
  { ...base, id: 'w1', url: 'https://hooks.slack.com/services/xxx', enabled: true, event_types: ['*'] },
  {
    ...base,
    id: 'w2',
    url: 'https://example.com/hooks/flag-it',
    enabled: false,
    event_types: ['flag.saved', 'change.approved'],
    description: 'CI pipeline',
  },
]

const meta = {
  title: 'Webhooks/WebhookList',
  component: WebhookList,
  args: {
    webhooks,
    onToggleEnabled: fn(),
    onTest: fn(),
    onReset: fn(),
    onDelete: fn(),
    onDismissSecret: fn(),
    onViewDeliveries: fn(),
  },
} satisfies Meta<typeof WebhookList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { webhooks: [] } }
export const SecretRevealed: Story = {
  args: { webhooks, revealedSecret: 'whsec_9b72aec7d1f04a2b8c3e5f6a7b8c9d0e' },
}
