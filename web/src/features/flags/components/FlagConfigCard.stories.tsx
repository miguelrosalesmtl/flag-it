import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { FlagConfigCard } from '@/features/flags/components/FlagConfigCard'
import type { Flag, FlagConfig } from '@/types/flag'

const flag: Flag = {
  id: 'f1',
  project_id: 'p1',
  key: 'dark-mode',
  name: 'Dark mode',
  description: '',
  client_side_available: true,
  variations: [true, false],
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:00:00Z',
}

const config: FlagConfig = {
  on: true,
  off_variation: 1,
  fallthrough: { variation: 0 },
  targets: [],
  rules: [],
  version: 3,
}

const meta = {
  title: 'Flags/FlagConfigCard',
  component: FlagConfigCard,
  args: { flag, config, onToggle: fn() },
} satisfies Meta<typeof FlagConfigCard>

export default meta
type Story = StoryObj<typeof meta>

export const On: Story = {}

export const Off: Story = {
  args: { config: { ...config, on: false } },
}

export const Toggling: Story = {
  args: { isToggling: true },
}

export const FlippingEmitsTheNewState: Story = {
  args: { config: { ...config, on: false } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('switch', { name: 'Toggle flag' }))
    await expect(args.onToggle).toHaveBeenCalledWith(true)
  },
}
