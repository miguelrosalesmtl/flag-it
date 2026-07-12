import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const meta = {
  title: 'UI/Select',
  component: Select,
  args: { onValueChange: fn() },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
        <SelectItem value="grapes">Grapes</SelectItem>
        <SelectItem value="pineapple">Pineapple</SelectItem>
      </SelectContent>
    </Select>
  ),
}

/** `size="sm"` shrinks the trigger to 32px. */
export const SmallTrigger: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Small" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="one">One</SelectItem>
        <SelectItem value="two">Two</SelectItem>
        <SelectItem value="three">Three</SelectItem>
      </SelectContent>
    </Select>
  ),
}

/** Grouped items with labels and a separator. */
export const Grouped: Story = {
  args: { defaultValue: 'cst' },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="est">Eastern Standard Time</SelectItem>
          <SelectItem value="cst">Central Standard Time</SelectItem>
          <SelectItem value="pst">Pacific Standard Time</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <SelectItem value="gmt">Greenwich Mean Time</SelectItem>
          <SelectItem value="cet">Central European Time</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

/** Individual items can be disabled, as can the whole select. */
export const DisabledStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Select {...args}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Some options unavailable" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
          <SelectItem value="enterprise" disabled>
            Enterprise — contact sales
          </SelectItem>
        </SelectContent>
      </Select>
      <Select {...args} disabled>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

/** Enough items to trigger the scroll buttons. */
export const Scrollable: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Pick a year" />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 40 }, (_, index) => 1990 + index).map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}

function ControlledSelect() {
  const [value, setValue] = useState('')

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="framework">Framework</Label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id="framework" className="w-56">
          <SelectValue placeholder="Select a framework" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="react">React</SelectItem>
          <SelectItem value="vue">Vue</SelectItem>
          <SelectItem value="svelte">Svelte</SelectItem>
          <SelectItem value="solid">Solid</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-muted-foreground text-sm">
        Selected: <span className="text-foreground font-medium">{value || 'none'}</span>
      </p>
    </div>
  )
}

/** Controlled, paired with a label. */
export const Controlled: Story = {
  render: () => <ControlledSelect />,
}
