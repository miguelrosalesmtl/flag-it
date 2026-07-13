import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { SegmentEditor } from '@/features/segments/components/SegmentEditor'
import type { Segment } from '@/types/segment'

const segment: Segment = {
  id: 's1',
  project_id: 'p1',
  key: 'beta-users',
  name: 'Beta users',
  description: 'Early-access cohort.',
  included: ['user-1', 'user-2'],
  excluded: ['user-9'],
  included_contexts: [],
  excluded_contexts: [],
  rules: [{ clauses: [{ contextKind: 'user', attribute: 'plan', op: 'in', values: ['pro'] }] }],
  version: 3,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
}

const meta = {
  title: 'Segments/SegmentEditor',
  component: SegmentEditor,
  args: { segment, onSave: fn() },
} satisfies Meta<typeof SegmentEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Saving: Story = { args: { isSaving: true } }
