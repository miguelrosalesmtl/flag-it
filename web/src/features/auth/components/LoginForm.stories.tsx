import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { LoginForm } from '@/features/auth/components/LoginForm'

const meta = {
  title: 'Auth/LoginForm',
  component: LoginForm,
  args: { onSubmit: fn() },
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = {
  args: { isSubmitting: true },
}

export const WithError: Story = {
  args: { errorMessage: 'Invalid email or password.' },
}

export const SubmitEmitsCredentials: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('fill and submit', async () => {
      await userEvent.type(canvas.getByLabelText('Email'), 'admin@flag-it.dev')
      await userEvent.type(canvas.getByLabelText('Password'), 'supersecret123')
      await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }))
    })

    await step('credentials are emitted', async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: 'admin@flag-it.dev',
        password: 'supersecret123',
      })
    })
  },
}
