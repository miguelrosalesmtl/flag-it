import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronsUpDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

const repos = ['@radix-ui/primitives', '@radix-ui/colors', '@stitches/react']

/** Uncontrolled: the trigger toggles the content, starting closed. */
export const Default: Story = {
  render: () => (
    <Collapsible className="flex w-72 flex-col gap-2">
      <div className="flex items-center justify-between gap-4 px-1">
        <h4 className="text-sm font-semibold">@peduarte starred 3 repositories</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronsUpDownIcon />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 font-mono text-sm">{repos[0]}</div>
      <CollapsibleContent className="flex flex-col gap-2">
        {repos.slice(1).map((repo) => (
          <div key={repo} className="rounded-md border px-4 py-2 font-mono text-sm">
            {repo}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ),
}

/** Starts expanded via `defaultOpen`. */
export const DefaultOpen: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-72 rounded-md border p-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          Deployment details
          <ChevronsUpDownIcon />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground pt-3 text-sm">
        Built in 12s from commit <span className="font-mono">a1b2c3d</span> and shipped to
        production.
      </CollapsibleContent>
    </Collapsible>
  ),
}

/** Controlled by the parent, so the open state can drive other UI. */
function ControlledCollapsible() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-72 flex-col gap-2">
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border p-4">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            {open ? 'Hide' : 'Show'} advanced settings
            <ChevronsUpDownIcon />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="text-muted-foreground pt-3 text-sm">
          Nothing dangerous in here, promise.
        </CollapsibleContent>
      </Collapsible>
      <p className="text-muted-foreground text-xs">open: {String(open)}</p>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledCollapsible />,
}

/** Disabled: the trigger no longer toggles. */
export const Disabled: Story = {
  render: () => (
    <Collapsible disabled className="w-72 rounded-md border p-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          Locked section
          <ChevronsUpDownIcon />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground pt-3 text-sm">
        You will never see this.
      </CollapsibleContent>
    </Collapsible>
  ),
}
