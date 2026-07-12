import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from 'lucide-react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const meta = {
  title: 'UI/ToggleGroup',
  component: ToggleGroup,
  args: { type: 'multiple' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
    size: { control: 'inline-radio', options: ['sm', 'default', 'lg'] },
    spacing: { control: 'number' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

/** `type="multiple"` — any number of formatting marks can be active. */
export const Default: Story = {
  render: () => (
    <ToggleGroup type="multiple" defaultValue={['bold']}>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** `type="single"` — exactly one alignment at a time. */
export const Single: Story = {
  render: () => (
    <ToggleGroup type="single" defaultValue="left" variant="outline">
      <ToggleGroupItem value="left" aria-label="Align left">
        <AlignLeftIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Align center">
        <AlignCenterIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Align right">
        <AlignRightIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** The `outline` variant joins the items into a single bordered control. */
export const Outline: Story = {
  render: () => (
    <ToggleGroup type="multiple" variant="outline" defaultValue={['bold', 'italic']}>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** All three sizes, in both variants. */
export const Sizes: Story = {
  render: () => (
    <div className="grid gap-4">
      {(['sm', 'default', 'lg'] as const).map((size) => (
        <div key={size} className="flex items-center gap-4">
          <ToggleGroup type="multiple" size={size} defaultValue={['bold']}>
            <ToggleGroupItem value="bold" aria-label={`Bold, ${size}`}>
              <BoldIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label={`Italic, ${size}`}>
              <ItalicIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label={`Underline, ${size}`}>
              <UnderlineIcon />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="multiple" variant="outline" size={size} defaultValue={['italic']}>
            <ToggleGroupItem value="bold" aria-label={`Outline bold, ${size}`}>
              <BoldIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label={`Outline italic, ${size}`}>
              <ItalicIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label={`Outline underline, ${size}`}>
              <UnderlineIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      ))}
    </div>
  ),
}

/** `spacing` separates the items instead of joining them. */
export const Spacing: Story = {
  render: () => (
    <ToggleGroup type="multiple" variant="outline" spacing={2} defaultValue={['bold']}>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <ToggleGroup type="multiple" variant="outline" defaultValue={['bold']} disabled>
      <ToggleGroupItem value="bold" aria-label="Toggle bold">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Toggle italic">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Toggle underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** A controlled text-formatting toolbar reporting the active marks. */
// Hooks must live in a real component, not in a `render` callback — the
// rules-of-hooks lint rule (correctly) does not recognise `render` as one.
function ControlledToggleGroup() {
  const [marks, setMarks] = useState<string[]>(['bold'])

  return (
    <div className="grid gap-3">
      <ToggleGroup type="multiple" variant="outline" value={marks} onValueChange={setMarks}>
        <ToggleGroupItem value="bold" aria-label="Toggle bold">
          <BoldIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Toggle italic">
          <ItalicIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Toggle underline">
          <UnderlineIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground text-sm">
        Active: {marks.length > 0 ? marks.join(', ') : 'none'}
      </p>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledToggleGroup />,
}
