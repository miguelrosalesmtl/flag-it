import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowRightIcon, CheckIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

/**
 * A small pill for statuses, counts and labels.
 *
 * It renders a `span` by default. Pass `asChild` to hand the styling to an `a` or a
 * `button` — the variants carry `[a&]:hover:` rules that only light up in that case.
 */
const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'Badge' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Destructive: Story = { args: { variant: 'destructive' } }
export const Outline: Story = { args: { variant: 'outline' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Link: Story = { args: { variant: 'link' } }

/** An `svg` child is sized down to 12px automatically. */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <CheckIcon />
        Verified
      </>
    ),
  },
}

/** `asChild` makes the badge an anchor, which enables the hover styles. */
export const AsLink: Story = {
  args: {
    asChild: true,
    variant: 'secondary',
    children: (
      <a href="#changelog">
        v2.1.0
        <ArrowRightIcon />
      </a>
    ),
  },
}

/** Every variant side by side. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
      <Badge variant="link">Link</Badge>
    </div>
  ),
}
