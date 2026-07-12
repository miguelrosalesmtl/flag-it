import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const meta = {
  title: 'UI/Spinner',
  component: Spinner,
  argTypes: {
    className: { control: 'text' },
  },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** The spinner inherits its size from utility classes on `className`. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner className="size-3" />
      <Spinner className="size-4" />
      <Spinner className="size-6" />
      <Spinner className="size-8" />
      <Spinner className="size-12" />
    </div>
  ),
}

/** Colour follows `currentColor`, so it can be tinted like any text. */
export const Colors: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Spinner className="size-6" />
      <Spinner className="text-muted-foreground size-6" />
      <Spinner className="text-primary size-6" />
      <Spinner className="text-destructive size-6" />
    </div>
  ),
}

/** A pending action: disable the button and swap in a spinner. */
export const InButton: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>
        <Spinner />
        Saving…
      </Button>
      <Button variant="outline" disabled>
        <Spinner />
        Please wait
      </Button>
      <Button variant="secondary" size="sm" disabled>
        <Spinner />
        Loading
      </Button>
    </div>
  ),
}

/** Centred inside a panel while its contents load. */
export const LoadingPanel: Story = {
  render: () => (
    <div className="flex h-40 w-80 flex-col items-center justify-center gap-3 rounded-lg border">
      <Spinner className="text-muted-foreground size-6" />
      <p className="text-muted-foreground text-sm">Loading invoices…</p>
    </div>
  ),
}
