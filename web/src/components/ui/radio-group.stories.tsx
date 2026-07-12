import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  args: { onValueChange: fn() },
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { defaultValue: 'comfortable' },
  render: (args) => (
    <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="default" id="density-default" />
        <Label htmlFor="density-default">Default</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="density-comfortable" />
        <Label htmlFor="density-comfortable">Comfortable</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="density-compact" />
        <Label htmlFor="density-compact">Compact</Label>
      </div>
    </RadioGroup>
  ),
}

/** One option is unavailable; the whole group can also be disabled. */
export const WithDisabledOption: Story = {
  args: { defaultValue: 'monthly' },
  render: (args) => (
    <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="monthly" id="plan-monthly" />
        <Label htmlFor="plan-monthly">Monthly</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="yearly" id="plan-yearly" />
        <Label htmlFor="plan-yearly">Yearly (save 20%)</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="lifetime" id="plan-lifetime" disabled />
        <Label htmlFor="plan-lifetime">Lifetime — sold out</Label>
      </div>
    </RadioGroup>
  ),
}

/** Entire group disabled. */
export const Disabled: Story = {
  args: { defaultValue: 'email', disabled: true },
  render: (args) => (
    <RadioGroup {...args}>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="email" id="notify-email" />
        <Label htmlFor="notify-email">Email</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="sms" id="notify-sms" />
        <Label htmlFor="notify-sms">SMS</Label>
      </div>
    </RadioGroup>
  ),
}

/** Laid out horizontally by overriding the grid. */
export const Horizontal: Story = {
  args: { defaultValue: 'md' },
  render: (args) => (
    <RadioGroup {...args} className="flex gap-6">
      {['sm', 'md', 'lg'].map((size) => (
        <div key={size} className="flex items-center gap-2">
          <RadioGroupItem value={size} id={`size-${size}`} />
          <Label htmlFor={`size-${size}`}>{size.toUpperCase()}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
}

function ControlledRadioGroup() {
  const [value, setValue] = useState('standard')

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup value={value} onValueChange={setValue}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="standard" id="ship-standard" />
          <Label htmlFor="ship-standard">Standard — 5 days</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="express" id="ship-express" />
          <Label htmlFor="ship-express">Express — 2 days</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="overnight" id="ship-overnight" />
          <Label htmlFor="ship-overnight">Overnight</Label>
        </div>
      </RadioGroup>
      <p className="text-muted-foreground text-sm">
        Selected: <span className="text-foreground font-medium">{value}</span>
      </p>
    </div>
  )
}

/** Controlled: the selected value is echoed back below the group. */
export const Controlled: Story = {
  render: () => <ControlledRadioGroup />,
}
