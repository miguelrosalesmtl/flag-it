import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ProjectList } from '@/features/projects/components/ProjectList'
import type { Project } from '@/types/project'

const projects: Project[] = [
  {
    id: '1',
    tenant_id: 't1',
    key: 'checkout',
    name: 'Checkout',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: '2',
    tenant_id: 't1',
    key: 'mobile-app',
    name: 'Mobile App',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Projects/ProjectList',
  component: ProjectList,
  args: { onOpen: fn() },
} satisfies Meta<typeof ProjectList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { projects },
}

export const Empty: Story = {
  args: { projects: [] },
}
