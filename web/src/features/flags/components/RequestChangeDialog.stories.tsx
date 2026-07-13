import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { RequestChangeDialog } from '@/features/flags/components/RequestChangeDialog'

const meta = {
  title: 'Flags/RequestChangeDialog',
  component: RequestChangeDialog,
  args: { currentOn: false, envKey: 'production', onSubmit: fn() },
} satisfies Meta<typeof RequestChangeDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const CurrentlyOn: Story = { args: { currentOn: true } }
