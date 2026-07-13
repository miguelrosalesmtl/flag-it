import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { FlagTargeting } from '@/features/flags/components/FlagTargeting'
import type { Flag, FlagConfig } from '@/types/flag'

const flag: Flag = {
  id: 'f1', project_id: 'p1', key: 'dark-mode', name: 'Dark mode', description: '',
  client_side_available: true, temporary: false, variations: [true, false],
  created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z',
}

const config: FlagConfig = {
  on: true, off_variation: 1, fallthrough: { variation: 0 },
  targets: [{ contextKind: 'user', variation: 0, values: ['user-1'] }], rules: [], version: 3,
}

const meta = {
  title: 'Flags/FlagTargeting',
  component: FlagTargeting,
  args: { flag, config, onSetFallthrough: fn(), onSetOffVariation: fn(), onAddTarget: fn(), onRemoveTarget: fn() },
} satisfies Meta<typeof FlagTargeting>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
