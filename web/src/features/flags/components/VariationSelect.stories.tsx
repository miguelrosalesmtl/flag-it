import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { VariationSelect } from '@/features/flags/components/VariationSelect'

const meta = {
  title: 'Flags/VariationSelect',
  component: VariationSelect,
  args: { variations: [true, false], value: 0, onChange: fn() },
} satisfies Meta<typeof VariationSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Boolean_: Story = {}
export const Strings: Story = { args: { variations: ['free', 'pro', 'enterprise'], value: 1 } }
