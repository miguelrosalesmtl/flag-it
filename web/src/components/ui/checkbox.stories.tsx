import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  args: {
    onCheckedChange: fn(),
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = {
  args: { defaultChecked: true },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
}

/** Fails validation — `aria-invalid` paints the border and ring destructive. */
export const Invalid: Story = {
  args: { 'aria-invalid': true },
}

/** Pair with a `Label` and share an `id` so clicking the text toggles the box. */
export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" {...args} />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
}

/** A controlled checkbox driving state in the parent. */
function ControlledCheckbox() {
  const [checked, setChecked] = useState(true)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id="notifications"
          checked={checked}
          onCheckedChange={(next) => setChecked(next === true)}
        />
        <div className="grid gap-1">
          <Label htmlFor="notifications">Email notifications</Label>
          <p className="text-muted-foreground text-sm">
            Currently {checked ? 'subscribed' : 'unsubscribed'}.
          </p>
        </div>
      </div>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledCheckbox />,
}
