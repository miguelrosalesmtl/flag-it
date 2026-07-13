import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { CreateTriggerDialog } from '@/features/flags/components/CreateTriggerDialog'

const meta = {
  title: 'Flags/CreateTriggerDialog',
  component: CreateTriggerDialog,
  args: { envKey: 'production', onCreate: fn() },
} satisfies Meta<typeof CreateTriggerDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
