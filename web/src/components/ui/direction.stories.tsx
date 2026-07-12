import type { Meta, StoryObj } from '@storybook/react-vite'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DirectionProvider, useDirection } from '@/components/ui/direction'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

/**
 * `DirectionProvider` renders no markup of its own. It puts the reading direction into
 * React context so that Radix primitives beneath it flip their behaviour: sliders fill
 * from the other end, submenus open the other way, arrow keys reverse.
 *
 * It does NOT set the DOM `dir` attribute — CSS still needs that. The stories below wrap
 * the content in a `<div dir={...}>` as well, which is what a real app does at the root.
 */
const meta = {
  title: 'UI/Direction',
  component: DirectionProvider,
  args: { dir: 'rtl' },
  argTypes: {
    dir: { control: 'inline-radio', options: ['ltr', 'rtl'] },
  },
} satisfies Meta<typeof DirectionProvider>

export default meta
type Story = StoryObj<typeof meta>

/** Reads the direction back out of the nearest provider. */
function DirectionReadout() {
  const direction = useDirection()

  return (
    <p className="text-muted-foreground text-sm">
      Primitives in this subtree resolve their direction as{' '}
      <span className="text-foreground font-mono font-medium">{direction}</span>.
    </p>
  )
}

function Demo() {
  return (
    <div className="flex w-80 flex-col gap-4 rounded-md border p-4">
      <DirectionReadout />
      <Slider defaultValue={[35]} max={100} step={1} />
      <div className="flex items-center gap-2">
        <Checkbox id="direction-terms" defaultChecked />
        <Label htmlFor="direction-terms">Remember this device</Label>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-fit">
            Open menu
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Copy link</DropdownMenuItem>
              <DropdownMenuItem>Email link</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Flip the `dir` control to compare: the submenu and the slider both mirror. */
export const Default: Story = {
  render: ({ dir }) => (
    <DirectionProvider dir={dir}>
      <div dir={dir}>
        <Demo />
      </div>
    </DirectionProvider>
  ),
}

export const RightToLeft: Story = {
  args: { dir: 'rtl' },
  render: ({ dir }) => (
    <DirectionProvider dir={dir}>
      <div dir={dir}>
        <Demo />
      </div>
    </DirectionProvider>
  ),
}

export const LeftToRight: Story = {
  args: { dir: 'ltr' },
  render: ({ dir }) => (
    <DirectionProvider dir={dir}>
      <div dir={dir}>
        <Demo />
      </div>
    </DirectionProvider>
  ),
}
