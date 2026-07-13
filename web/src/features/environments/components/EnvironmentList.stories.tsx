import type { Meta, StoryObj } from '@storybook/react-vite'

import { EnvironmentList } from '@/features/environments/components/EnvironmentList'
import type { Environment } from '@/types/environment'

const environments: Environment[] = [
  {
    id: 'e1',
    project_id: 'p1',
    key: 'production',
    name: 'Production',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
  {
    id: 'e2',
    project_id: 'p1',
    key: 'staging',
    name: 'Staging',
    created_at: '2026-07-12T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
  },
]

const meta = {
  title: 'Environments/EnvironmentList',
  component: EnvironmentList,
} satisfies Meta<typeof EnvironmentList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { environments },
}

export const Empty: Story = {
  args: { environments: [] },
}
