import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ChevronDownIcon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react'
import { fn } from 'storybook/test'

import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@/components/ui/button-group'

/**
 * Welds adjacent controls into one segmented unit by flattening the inner corners and
 * collapsing the shared borders.
 *
 * Because it removes the leading border of every child but the first, it reads best with
 * bordered children — `Button variant="outline"`, inputs, `ButtonGroupText`.
 */
const meta = {
  title: 'UI/ButtonGroup',
  component: ButtonGroup,
  args: { orientation: 'horizontal' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  render: (args) => (
    <ButtonGroup {...args}>
      <Button variant="outline" onClick={fn()}>
        Preview
      </Button>
      <Button variant="outline" onClick={fn()}>
        Code
      </Button>
      <Button variant="outline" onClick={fn()}>
        Settings
      </Button>
    </ButtonGroup>
  ),
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Stacked, with the top and bottom corners flattened instead of the sides. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
}

/** An icon-only toolbar. Give each button an `aria-label`, since there is no text. */
export const IconGroup: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon" aria-label="Align left" onClick={fn()}>
        <AlignLeftIcon />
      </Button>
      <Button variant="outline" size="icon" aria-label="Align center" onClick={fn()}>
        <AlignCenterIcon />
      </Button>
      <Button variant="outline" size="icon" aria-label="Align right" onClick={fn()}>
        <AlignRightIcon />
      </Button>
    </ButtonGroup>
  ),
}

/**
 * A split button: the primary action and its dropdown affordance share one shape, with
 * `ButtonGroupSeparator` drawing the hairline between them.
 */
export const SplitButton: Story = {
  render: () => (
    <ButtonGroup>
      <Button onClick={fn()}>Deploy</Button>
      <ButtonGroupSeparator />
      <Button size="icon" aria-label="More deploy options" onClick={fn()}>
        <ChevronDownIcon />
      </Button>
    </ButtonGroup>
  ),
}

/** `ButtonGroupText` is a non-interactive segment — a unit, a prefix, a read-out. */
export const WithText: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon" aria-label="Decrease" onClick={fn()}>
        <MinusIcon />
      </Button>
      <ButtonGroupText>12 seats</ButtonGroupText>
      <Button variant="outline" size="icon" aria-label="Increase" onClick={fn()}>
        <PlusIcon />
      </Button>
    </ButtonGroup>
  ),
}

/** Nesting groups inside a group spaces them apart while each keeps its own seams. */
export const NestedGroups: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" size="icon" aria-label="Align left" onClick={fn()}>
          <AlignLeftIcon />
        </Button>
        <Button variant="outline" size="icon" aria-label="Align center" onClick={fn()}>
          <AlignCenterIcon />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button variant="outline" onClick={fn()}>
          Undo
        </Button>
        <Button variant="outline" onClick={fn()}>
          Redo
        </Button>
      </ButtonGroup>
    </ButtonGroup>
  ),
}
