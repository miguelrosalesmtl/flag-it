import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ScheduledChangesCard } from '@/features/flags/components/ScheduledChangesCard'
import type { ScheduledChange } from '@/types/scheduled-change'

const base: Omit<ScheduledChange, 'id' | 'status'> = {
  project_id: 'web',
  environment_id: 'production',
  environment_key: 'production',
  flag_key: 'beta',
  instructions: [{ kind: 'turnFlagOn' }],
  comment: 'Go live for GA',
  scheduled_for: '2026-07-20T09:00:00Z',
  created_by: 'u1',
  created_by_email: 'ada@example.com',
  created_at: '2026-07-13T09:00:00Z',
}

const changes: ScheduledChange[] = [
  { ...base, id: 's1', status: 'pending' },
  {
    ...base,
    id: 's2',
    status: 'applied',
    instructions: [{ kind: 'turnFlagOff' }],
    applied_at: '2026-07-14T09:00:00Z',
  },
]

const meta = {
  title: 'Flags/ScheduledChangesCard',
  component: ScheduledChangesCard,
  args: { changes, onCancel: fn() },
} satisfies Meta<typeof ScheduledChangesCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { changes: [] } }
