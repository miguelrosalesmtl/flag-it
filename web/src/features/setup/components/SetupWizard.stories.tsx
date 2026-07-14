import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { SetupWizard } from '@/features/setup/components/SetupWizard'

const meta = {
  title: 'Setup/SetupWizard',
  component: SetupWizard,
  args: { onSubmit: fn() },
} satisfies Meta<typeof SetupWizard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Submitting: Story = {
  args: { isSubmitting: true },
}

/** Walk both steps and confirm the single emitted payload, with slug auto-derived from the name. */
export const CompletingBothSteps: Story = {
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step('step 1: account', async () => {
      await userEvent.type(canvas.getByLabelText('Email'), 'admin@flag-it.dev')
      await userEvent.type(canvas.getByLabelText('Password'), 'supersecret123')
      await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    })

    await step('step 2: organization (slug auto-fills)', async () => {
      await userEvent.type(canvas.getByLabelText('Organization name'), 'Acme Inc')
      await expect(canvas.getByLabelText('Organization slug')).toHaveValue('acme-inc')
      await userEvent.click(canvas.getByRole('button', { name: 'Finish setup' }))
    })

    await step('one payload emitted', async () => {
      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: 'admin@flag-it.dev',
        password: 'supersecret123',
        full_name: undefined,
        organization_name: 'Acme Inc',
        organization_slug: 'acme-inc',
      })
    })
  },
}
