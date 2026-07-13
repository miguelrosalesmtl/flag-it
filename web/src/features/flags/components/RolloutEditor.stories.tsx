import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { RolloutEditor } from '@/features/flags/components/RolloutEditor'

const meta = {
  title: 'Flags/RolloutEditor',
  component: RolloutEditor,
  args: { variations: [true, false], percents: [70, 30], onChange: fn() },
} satisfies Meta<typeof RolloutEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Uneven: Story = { args: { variations: ['free', 'pro', 'enterprise'], percents: [50, 30, 20] } }
export const Invalid: Story = { args: { variations: [true, false], percents: [60, 30] } }
