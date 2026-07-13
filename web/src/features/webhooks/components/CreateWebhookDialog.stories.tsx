import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { CreateWebhookDialog } from '@/features/webhooks/components/CreateWebhookDialog'

const meta = {
  title: 'Webhooks/CreateWebhookDialog',
  component: CreateWebhookDialog,
  args: { onCreate: fn() },
} satisfies Meta<typeof CreateWebhookDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
