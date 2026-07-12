import type { Meta, StoryObj } from '@storybook/react-vite'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const meta = {
  title: 'UI/Label',
  component: Label,
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="ada@example.com" />
    </div>
  ),
}

export const WithDisabledInput: Story = {
  render: () => (
    <div className="group grid w-72 gap-2" data-disabled="true">
      <Label htmlFor="disabled-api-key">API key</Label>
      <Input id="disabled-api-key" placeholder="sk-…" disabled defaultValue="sk-live-0000" />
    </div>
  ),
}

export const Stacked: Story = {
  render: () => (
    <form className="grid w-72 gap-4">
      <div className="grid gap-2">
        <Label htmlFor="first-name">First name</Label>
        <Input id="first-name" placeholder="Ada" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="last-name">Last name</Label>
        <Input id="last-name" placeholder="Lovelace" />
      </div>
    </form>
  ),
}
