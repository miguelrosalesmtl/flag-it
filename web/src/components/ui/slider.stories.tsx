import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

const meta = {
  title: 'UI/Slider',
  component: Slider,
  args: { defaultValue: [50], min: 0, max: 100, step: 1, onValueChange: fn() },
  argTypes: {
    disabled: { control: 'boolean' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Two thumbs define a range. */
export const Range: Story = {
  args: { defaultValue: [25, 75] },
}

/** Coarse steps snap the thumb to 10-unit increments. */
export const Stepped: Story = {
  args: { defaultValue: [40], step: 10 },
}

export const Disabled: Story = {
  args: { defaultValue: [30], disabled: true },
}

/** Vertical orientation needs a parent with height. */
export const Vertical: Story = {
  args: { defaultValue: [60], orientation: 'vertical' },
  decorators: [
    (Story) => (
      <div className="flex h-60 justify-center">
        <Story />
      </div>
    ),
  ],
}

function VolumeSlider() {
  const [value, setValue] = useState([35])

  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="volume">Volume</Label>
        <span className="text-muted-foreground text-sm tabular-nums">{value[0]}</span>
      </div>
      <Slider id="volume" value={value} onValueChange={setValue} max={100} step={1} />
    </div>
  )
}

function PriceRangeSlider() {
  const [range, setRange] = useState([200, 800])

  return (
    <div className="flex w-80 flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="price">Price</Label>
        <span className="text-muted-foreground text-sm tabular-nums">
          ${range[0]} – ${range[1]}
        </span>
      </div>
      <Slider
        id="price"
        value={range}
        onValueChange={setRange}
        min={0}
        max={1000}
        step={10}
        minStepsBetweenThumbs={1}
      />
    </div>
  )
}

/** Controlled: the live value renders next to the label. */
export const Controlled: Story = {
  render: () => <VolumeSlider />,
}

/** A controlled price range with both bounds displayed. */
export const ControlledRange: Story = {
  render: () => <PriceRangeSlider />,
}
