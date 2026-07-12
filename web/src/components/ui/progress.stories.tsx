import { useEffect, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { Progress } from '@/components/ui/progress'

const meta = {
  title: 'UI/Progress',
  component: Progress,
  args: { value: 60 },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { value: 0 } }
export const Complete: Story = { args: { value: 100 } }

/** Common checkpoints, stacked for comparison. */
export const Steps: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      {[0, 25, 50, 75, 100].map((value) => (
        <div key={value} className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">{value}%</span>
          <Progress value={value} />
        </div>
      ))}
    </div>
  ),
}

function AnimatedProgress() {
  const [value, setValue] = useState(10)

  useEffect(() => {
    const id = setInterval(() => {
      setValue((current) => (current >= 100 ? 0 : current + 10))
    }, 700)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex w-80 flex-col gap-2">
      <Progress value={value} />
      <span className="text-muted-foreground text-xs tabular-nums">{value}% uploaded</span>
    </div>
  )
}

/** Animates upward so the indicator transition is visible. */
export const Animated: Story = {
  render: () => <AnimatedProgress />,
}
