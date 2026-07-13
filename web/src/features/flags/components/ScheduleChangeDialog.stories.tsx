import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ScheduleChangeDialog } from '@/features/flags/components/ScheduleChangeDialog'

const meta = {
  title: 'Flags/ScheduleChangeDialog',
  component: ScheduleChangeDialog,
  args: { currentOn: false, envKey: 'production', onSubmit: fn() },
} satisfies Meta<typeof ScheduleChangeDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const CurrentlyOn: Story = { args: { currentOn: true } }
