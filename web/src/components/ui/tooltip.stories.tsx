import type { Meta, StoryObj } from '@storybook/react-vite'
import { PlusIcon, TrashIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

/** Tooltips must be rendered inside a `TooltipProvider`. */
export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

/** All four placements via the `side` prop on `TooltipContent`. */
export const Sides: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-3 p-12">
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger asChild>
              <Button variant="outline">{side}</Button>
            </TooltipTrigger>
            <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  ),
}

/** Icon-only buttons lean on tooltips to explain themselves. */
export const IconButtons: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Add item">
              <PlusIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add item</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Delete item">
              <TrashIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete item</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
}

/** Longer copy wraps and balances inside the tooltip. */
export const LongContent: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Retention policy</Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-56">
          Deleted projects stay recoverable for 30 days before they are permanently removed.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

/** Forced open so the content is visible without hovering. */
export const AlwaysOpen: Story = {
  render: () => (
    <TooltipProvider>
      <div className="p-12">
        <Tooltip open>
          <TooltipTrigger asChild>
            <Button variant="outline">Always showing</Button>
          </TooltipTrigger>
          <TooltipContent side="right">This tooltip is pinned open</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
}
