import type { Meta, StoryObj } from '@storybook/react-vite'

import { Label } from '@/components/ui/label'
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select'

const meta = {
  title: 'UI/NativeSelect',
  component: NativeSelect,
} satisfies Meta<typeof NativeSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <NativeSelect defaultValue="banana" className="w-56">
      <NativeSelectOption value="apple">Apple</NativeSelectOption>
      <NativeSelectOption value="banana">Banana</NativeSelectOption>
      <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
      <NativeSelectOption value="grapes">Grapes</NativeSelectOption>
      <NativeSelectOption value="pineapple">Pineapple</NativeSelectOption>
    </NativeSelect>
  ),
}

export const Small: Story = {
  render: () => (
    <NativeSelect size="sm" defaultValue="utc" className="w-56">
      <NativeSelectOption value="utc">UTC</NativeSelectOption>
      <NativeSelectOption value="pst">Pacific</NativeSelectOption>
      <NativeSelectOption value="est">Eastern</NativeSelectOption>
    </NativeSelect>
  ),
}

export const WithOptGroups: Story = {
  render: () => (
    <div className="grid w-56 gap-2">
      <Label htmlFor="timezone">Timezone</Label>
      <NativeSelect id="timezone" defaultValue="cet" className="w-56">
        <NativeSelectOptGroup label="North America">
          <NativeSelectOption value="pst">Pacific (PST)</NativeSelectOption>
          <NativeSelectOption value="cst">Central (CST)</NativeSelectOption>
          <NativeSelectOption value="est">Eastern (EST)</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOptGroup label="Europe">
          <NativeSelectOption value="gmt">Greenwich (GMT)</NativeSelectOption>
          <NativeSelectOption value="cet">Central European (CET)</NativeSelectOption>
          <NativeSelectOption value="eet">Eastern European (EET)</NativeSelectOption>
        </NativeSelectOptGroup>
      </NativeSelect>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <NativeSelect defaultValue="pro" disabled className="w-56">
      <NativeSelectOption value="free">Free</NativeSelectOption>
      <NativeSelectOption value="pro">Pro</NativeSelectOption>
      <NativeSelectOption value="team">Team</NativeSelectOption>
    </NativeSelect>
  ),
}

export const Invalid: Story = {
  render: () => (
    <NativeSelect defaultValue="" aria-invalid className="w-56">
      <NativeSelectOption value="" disabled>
        Select a plan…
      </NativeSelectOption>
      <NativeSelectOption value="free">Free</NativeSelectOption>
      <NativeSelectOption value="pro">Pro</NativeSelectOption>
    </NativeSelect>
  ),
}
