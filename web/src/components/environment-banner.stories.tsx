import type { Meta, StoryObj } from '@storybook/react-vite'

import { EnvironmentBanner } from '@/components/environment-banner'

const meta = {
  title: 'App/EnvironmentBanner',
  component: EnvironmentBanner,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EnvironmentBanner>

export default meta
type Story = StoryObj<typeof meta>

export const DevelopmentLiveApi: Story = {
  args: { environment: 'development', mocking: false },
}

export const DevelopmentMocked: Story = {
  args: { environment: 'development', mocking: true },
}

export const Staging: Story = {
  args: { environment: 'staging' },
}

/** Production renders nothing at all — the canvas below is intentionally empty. */
export const Production: Story = {
  args: { environment: 'production' },
}
