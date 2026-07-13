import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ChangeRequestList } from '@/features/approvals/components/ChangeRequestList'
import type { ChangeRequest } from '@/types/change'

const base: Omit<ChangeRequest, 'id' | 'status'> = {
  project_id: 'web',
  environment_id: 'production',
  environment_key: 'production',
  flag_key: 'new-checkout',
  instructions: [{ kind: 'turnFlagOn' }],
  comment: 'Launch checkout for GA',
  requested_by: 'u1',
  requested_by_email: 'ada@example.com',
  created_at: '2026-07-12T10:00:00Z',
}

const changes: ChangeRequest[] = [
  { ...base, id: 'c1', status: 'pending' },
  {
    ...base,
    id: 'c2',
    status: 'approved',
    instructions: [{ kind: 'turnFlagOff' }],
    comment: '',
    reviewed_by: 'u2',
    reviewed_by_email: 'alan@example.com',
    review_comment: 'LGTM',
    reviewed_at: '2026-07-12T11:00:00Z',
  },
]

const meta = {
  title: 'Approvals/ChangeRequestList',
  component: ChangeRequestList,
  args: { changes, onReview: fn() },
} satisfies Meta<typeof ChangeRequestList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { changes: [] } }
export const ReadOnly: Story = { args: { onReview: undefined } }
