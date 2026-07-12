import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertCircleIcon, CheckCircle2Icon, TerminalIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * A callout for content that deserves the user's attention.
 *
 * `Alert` is a grid: an optional leading `svg` occupies the first column, and
 * `AlertTitle` / `AlertDescription` stack in the second. Dropping the icon simply
 * collapses that column, so the same markup works with or without one.
 */
const meta = {
  title: 'UI/Alert',
  component: Alert,
  argTypes: {
    variant: { control: 'select', options: ['default', 'destructive'] },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <TerminalIcon />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  ),
}

/** Signals a failure or a destructive consequence. */
export const Destructive: Story = {
  args: { variant: 'destructive' },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertCircleIcon />
      <AlertTitle>Payment failed</AlertTitle>
      <AlertDescription>
        Your card was declined. Update the payment method and try again.
      </AlertDescription>
    </Alert>
  ),
}

/** Without an `svg` child the icon column collapses and the text is flush left. */
export const WithoutIcon: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertTitle>Scheduled maintenance</AlertTitle>
      <AlertDescription>
        The API will be briefly unavailable on Sunday at 02:00 UTC.
      </AlertDescription>
    </Alert>
  ),
}

/** The description is optional — a title alone stays vertically centred. */
export const TitleOnly: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <CheckCircle2Icon />
      <AlertTitle>Your changes have been saved.</AlertTitle>
    </Alert>
  ),
}
