import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { SegmentList } from '@/features/segments/components/SegmentList'
import type { Segment } from '@/types/segment'

const segments: Segment[] = [
  {
    id: 's1',
    project_id: 'p1',
    key: 'beta-users',
    name: 'Beta users',
    description: 'Early-access cohort.',
    included: ['user-1', 'user-2'],
    excluded: [],
    included_contexts: [],
    excluded_contexts: [],
    rules: [{ clauses: [{ contextKind: 'user', attribute: 'plan', op: 'in', values: ['pro'] }] }],
    version: 2,
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 's2',
    project_id: 'p1',
    key: 'internal',
    name: 'Internal staff',
    description: '',
    included: [],
    excluded: [],
    included_contexts: [],
    excluded_contexts: [],
    rules: [],
    version: 1,
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Segments/SegmentList',
  component: SegmentList,
  args: { onOpen: fn() },
} satisfies Meta<typeof SegmentList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { segments },
}

export const Empty: Story = {
  args: { segments: [] },
}
