import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { TriggersCard } from '@/features/flags/components/TriggersCard'
import type { FlagTrigger } from '@/types/trigger'

const base: Omit<FlagTrigger, 'id' | 'action' | 'enabled'> = {
  project_id: 'web',
  environment_id: 'production',
  environment_key: 'production',
  flag_key: 'kill-switch',
  description: 'PagerDuty incident webhook',
  exec_count: 3,
  created_by: 'u1',
  created_by_email: 'ada@example.com',
  created_at: '2026-07-13T09:00:00Z',
  last_executed_at: '2026-07-13T12:00:00Z',
}

const triggers: FlagTrigger[] = [
  { ...base, id: 't1', action: 'off', enabled: true },
  { ...base, id: 't2', action: 'on', enabled: false, description: 'Manual re-enable', exec_count: 0, last_executed_at: null },
]

const meta = {
  title: 'Flags/TriggersCard',
  component: TriggersCard,
  args: {
    triggers,
    onToggleEnabled: fn(),
    onReset: fn(),
    onDelete: fn(),
    onDismissUrl: fn(),
  },
} satisfies Meta<typeof TriggersCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { triggers: [] } }
export const UrlRevealed: Story = {
  args: {
    triggers,
    revealedUrl: 'http://localhost:8080/api/v1/triggers/trg_4056cb7182af4e1b',
  },
}
