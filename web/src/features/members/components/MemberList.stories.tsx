import type { Meta, StoryObj } from '@storybook/react-vite'

import { MemberList } from '@/features/members/components/MemberList'
import type { Member } from '@/types/member'

const members: Member[] = [
  { user_id: 'u1', email: 'admin@flag-it.dev', full_name: 'Admin', role: 'organization_admin' },
  { user_id: 'u2', email: 'dev@flag-it.dev', full_name: 'Dev', role: '' },
]

const meta = { title: 'Members/MemberList', component: MemberList } satisfies Meta<typeof MemberList>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = { args: { members } }
export const Empty: Story = { args: { members: [] } }
