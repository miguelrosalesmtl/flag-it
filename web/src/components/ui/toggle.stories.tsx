import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BoldIcon, ItalicIcon, StarIcon, UnderlineIcon } from 'lucide-react'

import { Toggle } from '@/components/ui/toggle'

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  args: {
    children: <BoldIcon />,
    'aria-label': 'Toggle bold',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'outline'] },
    size: { control: 'inline-radio', options: ['sm', 'default', 'lg'] },
    disabled: { control: 'boolean' },
    pressed: { control: 'boolean' },
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Outline: Story = { args: { variant: 'outline' } }
export const Pressed: Story = { args: { defaultPressed: true } }
export const Disabled: Story = { args: { disabled: true } }

/** Icon plus text label. */
export const WithText: Story = {
  args: {
    children: (
      <>
        <ItalicIcon />
        Italic
      </>
    ),
    variant: 'outline',
    'aria-label': 'Toggle italic',
  },
}

/** Every variant and size combination. */
export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Toggle size="sm" aria-label="Bold, small">
          <BoldIcon />
        </Toggle>
        <Toggle size="default" aria-label="Bold, default">
          <BoldIcon />
        </Toggle>
        <Toggle size="lg" aria-label="Bold, large">
          <BoldIcon />
        </Toggle>
      </div>
      <div className="flex items-center gap-3">
        <Toggle variant="outline" size="sm" aria-label="Italic, small">
          <ItalicIcon />
        </Toggle>
        <Toggle variant="outline" size="default" aria-label="Italic, default">
          <ItalicIcon />
        </Toggle>
        <Toggle variant="outline" size="lg" aria-label="Italic, large">
          <ItalicIcon />
        </Toggle>
      </div>
    </div>
  ),
}

/** Independent toggles acting as a small formatting toolbar. */
export const Toolbar: Story = {
  render: () => (
    <div className="flex items-center gap-1 rounded-md border p-1">
      <Toggle defaultPressed aria-label="Toggle bold">
        <BoldIcon />
      </Toggle>
      <Toggle aria-label="Toggle italic">
        <ItalicIcon />
      </Toggle>
      <Toggle aria-label="Toggle underline">
        <UnderlineIcon />
      </Toggle>
    </div>
  ),
}

/** Controlled: the pressed state lives in React state. */
// Hooks must live in a real component, not in a `render` callback — the
// rules-of-hooks lint rule (correctly) does not recognise `render` as one.
function ControlledToggle() {
  const [starred, setStarred] = useState(false)

  return (
    <div className="flex items-center gap-3">
      <Toggle
        variant="outline"
        pressed={starred}
        onPressedChange={setStarred}
        aria-label="Star this item"
      >
        <StarIcon />
        {starred ? 'Starred' : 'Star'}
      </Toggle>
      <span className="text-muted-foreground text-sm">
        {starred ? 'Added to favourites' : 'Not a favourite'}
      </span>
    </div>
  )
}

export const Controlled: Story = {
  render: () => <ControlledToggle />,
}
