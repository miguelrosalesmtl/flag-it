import type { Meta, StoryObj } from '@storybook/react-vite'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * The loading placeholder a container renders while a query is pending. Size it
 * with Tailwind classes to match whatever it is standing in for.
 */
const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { className: 'h-32 w-64' },
}

/** How UsersPage renders its pending state. */
export const CardGrid: Story = {
  render: () => (
    <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  ),
}
