import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ContextList } from '@/features/contexts/components/ContextList'
import type { SeenContext } from '@/types/context'

const contexts: SeenContext[] = [
  {
    id: 'c1',
    environment_id: 'e1',
    kind: 'user',
    key: 'alice',
    attributes: { plan: 'pro' },
    first_seen: '2026-07-12T00:00:00Z',
    last_seen: '2026-07-12T09:20:00Z',
  },
  {
    id: 'c2',
    environment_id: 'e1',
    kind: 'account',
    key: 'acme-corp',
    attributes: { tier: 'enterprise' },
    first_seen: '2026-07-12T00:00:00Z',
    last_seen: '2026-07-12T09:10:00Z',
  },
]

const meta = {
  title: 'Contexts/ContextList',
  component: ContextList,
  args: { onOpen: fn() },
} satisfies Meta<typeof ContextList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { contexts } }
export const Empty: Story = { args: { contexts: [] } }
