import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const meta = {
  title: 'UI/Switch',
  component: Switch,
  args: { onCheckedChange: fn() },
  argTypes: {
    size: { control: 'select', options: ['sm', 'default'] },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }
export const Small: Story = { args: { size: 'sm', defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }
export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } }

/** Paired with a `Label` — clicking the label toggles the switch. */
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane mode</Label>
    </div>
  ),
}

/** A realistic settings section, one row per preference. */
export const SettingsRows: Story = {
  render: () => (
    <div className="w-80 divide-y rounded-lg border">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="grid gap-1">
          <Label htmlFor="marketing-emails">Marketing emails</Label>
          <p className="text-muted-foreground text-sm">Receive product news and offers.</p>
        </div>
        <Switch id="marketing-emails" defaultChecked />
      </div>
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="grid gap-1">
          <Label htmlFor="security-alerts">Security alerts</Label>
          <p className="text-muted-foreground text-sm">Get notified about new sign-ins.</p>
        </div>
        <Switch id="security-alerts" defaultChecked />
      </div>
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="grid gap-1">
          <Label htmlFor="beta-features">Beta features</Label>
          <p className="text-muted-foreground text-sm">Not available on your plan.</p>
        </div>
        <Switch id="beta-features" disabled />
      </div>
    </div>
  ),
}

/** Both sizes side by side. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <Switch id="size-sm" size="sm" defaultChecked />
        <Label htmlFor="size-sm">Small</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="size-default" size="default" defaultChecked />
        <Label htmlFor="size-default">Default</Label>
      </div>
    </div>
  ),
}

// Hooks must live in a real component, not in a `render` callback — the
// rules-of-hooks lint rule (correctly) does not recognise `render` as one.
function ControlledSwitch() {
  const [enabled, setEnabled] = useState(false)

  return (
    <div className="grid w-64 gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="controlled-switch">Dark mode</Label>
        <Switch id="controlled-switch" checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <p className="text-muted-foreground text-sm">Dark mode is {enabled ? 'on' : 'off'}.</p>
    </div>
  )
}

/** Fully controlled, reflecting state back to the user. */
export const Controlled: Story = {
  render: () => <ControlledSwitch />,
}
