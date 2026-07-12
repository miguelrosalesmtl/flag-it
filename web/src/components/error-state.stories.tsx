import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ErrorState } from '@/components/error-state'

/**
 * What a container renders when a query fails. Pass `onRetry` and it offers a
 * retry button; omit it and it is purely informational.
 */
const meta = {
  title: 'UI/ErrorState',
  component: ErrorState,
  args: { onRetry: fn() },
} satisfies Meta<typeof ErrorState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithMessage: Story = {
  args: { message: 'Request failed: 500 /users' },
}

export const CustomTitle: Story = {
  args: { title: 'Could not load users', message: 'The server is not responding.' },
}

/** No retry handler — nothing to click. */
export const NotRetryable: Story = {
  args: { message: 'You do not have access to this resource.', onRetry: undefined },
}
