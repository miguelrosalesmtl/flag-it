import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  args: {
    placeholder: 'Type your message here.',
    onChange: fn(),
  },
  argTypes: {
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <Textarea {...args} className="w-80" />,
}

export const WithValue: Story = {
  args: { defaultValue: 'The deploy went out at 14:02 and the error rate is back to baseline.' },
  render: (args) => <Textarea {...args} className="w-80" />,
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => <Textarea {...args} className="w-80" />,
}

/** `aria-invalid` drives the error styling. */
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'Too short' },
  render: (args) => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="invalid-bio">Bio</Label>
      <Textarea id="invalid-bio" {...args} />
      <p className="text-destructive text-sm">Bio must be at least 20 characters.</p>
    </div>
  ),
}

/** Labelled with helper text — the usual form pairing. */
export const WithLabel: Story = {
  render: () => (
    <div className="grid w-80 gap-2">
      <Label htmlFor="feedback">Your feedback</Label>
      <Textarea id="feedback" placeholder="What could we do better?" />
      <p className="text-muted-foreground text-sm">We read every message.</p>
    </div>
  ),
}

/** A full comment box with a character counter and submit action. */
// Hooks must live in a real component, not in a `render` callback — the
// rules-of-hooks lint rule (correctly) does not recognise `render` as one.
function CommentBox() {
  const limit = 180
  const [value, setValue] = useState('')

  return (
    <form className="grid w-80 gap-2" onSubmit={(event) => event.preventDefault()}>
      <Label htmlFor="comment">Comment</Label>
      <Textarea
        id="comment"
        placeholder="Share your thoughts…"
        maxLength={limit}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {value.length}/{limit}
        </span>
        <Button type="submit" size="sm" disabled={value.length === 0}>
          Post
        </Button>
      </div>
    </form>
  )
}

export const WithCharacterCount: Story = {
  render: () => <CommentBox />,
}
