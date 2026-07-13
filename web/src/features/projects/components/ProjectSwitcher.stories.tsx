import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ProjectSwitcher } from '@/features/projects/components/ProjectSwitcher'
import type { Project } from '@/types/project'

const projects: Project[] = [
  {
    id: 'p1',
    tenant_id: 't1',
    key: 'checkout',
    name: 'Checkout',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'p2',
    tenant_id: 't1',
    key: 'mobile-app',
    name: 'Mobile App',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Projects/ProjectSwitcher',
  component: ProjectSwitcher,
  args: { projects, currentKey: 'checkout', onSelect: fn() },
} satisfies Meta<typeof ProjectSwitcher>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
