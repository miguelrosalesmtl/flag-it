import type { Meta, StoryObj } from '@storybook/react-vite'

import { AuditList } from '@/features/audit/components/AuditList'
import type { AuditEntry } from '@/types/audit'

const entries: AuditEntry[] = [
  { id: 'a1', actor_email: 'ada@example.com', action: 'flag.config.patched', resource_type: 'flag', resource_key: 'new-checkout', comment: 'Launch for GA', created_at: '2026-07-13T12:00:00Z' },
  { id: 'a2', actor_email: 'alan@example.com', action: 'change.approved', resource_type: 'flag', resource_key: 'pricing-tier', created_at: '2026-07-13T11:30:00Z' },
  { id: 'a3', actor_email: 'grace@example.com', action: 'sdk_key.revoked', resource_type: 'sdk_key', resource_key: 'k-123', created_at: '2026-07-13T10:00:00Z' },
]

const meta = {
  title: 'Audit/AuditList',
  component: AuditList,
  args: { entries },
} satisfies Meta<typeof AuditList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { entries: [] } }
