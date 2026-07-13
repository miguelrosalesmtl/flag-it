import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { FlagLifecycleList } from '@/features/flags/components/FlagLifecycleList'
import type { FlagLifecycle } from '@/types/flag'

const base = {
  project_id: 'web',
  description: '',
  client_side_available: false,
  variations: [true, false],
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
}

const flags: FlagLifecycle[] = [
  { ...base, id: 'f1', key: 'new-checkout', name: 'New checkout', temporary: true, status: 'active', last_evaluated: '2026-07-12T00:00:00Z' },
  { ...base, id: 'f2', key: 'old-banner', name: 'Old banner', temporary: true, status: 'inactive', last_evaluated: '2026-05-01T00:00:00Z' },
  { ...base, id: 'f3', key: 'perms-v2', name: 'Perms v2', temporary: false, status: 'new', last_evaluated: null },
]

const meta = {
  title: 'Flags/FlagLifecycleList',
  component: FlagLifecycleList,
  args: { flags, onOpen: fn() },
} satisfies Meta<typeof FlagLifecycleList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { flags: [] } }
