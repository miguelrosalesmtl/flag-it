import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { SdkKeyList } from '@/features/sdk-keys/components/SdkKeyList'
import type { SdkKey } from '@/types/sdk-key'

const keys: SdkKey[] = [
  { id: 'k1', environment_id: 'e1', key: 'sdk-abcdef0123456789', kind: 'server', name: 'CI', created_at: '2026-07-12T00:00:00Z' },
  { id: 'k2', environment_id: 'e1', key: 'client-9876543210fedcba', kind: 'client', name: 'Web app', created_at: '2026-07-12T00:00:00Z' },
]

const meta = {
  title: 'SDKKeys/SdkKeyList',
  component: SdkKeyList,
  args: { onRevoke: fn() },
} satisfies Meta<typeof SdkKeyList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { keys } }
export const Empty: Story = { args: { keys: [] } }
