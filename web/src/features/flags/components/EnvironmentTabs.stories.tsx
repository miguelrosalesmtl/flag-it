import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { EnvironmentTabs } from '@/features/flags/components/EnvironmentTabs'
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
  title: 'Flags/EnvironmentTabs',
  component: EnvironmentTabs,
  args: { environments, selectedKey: 'production', onSelect: fn() },
} satisfies Meta<typeof EnvironmentTabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const StagingSelected: Story = {
  args: { selectedKey: 'staging' },
}
