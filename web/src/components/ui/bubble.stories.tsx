import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from '@/components/ui/bubble'

/**
 * A chat message bubble.
 *
 * `Bubble` is only a wrapper: it styles its `BubbleContent` child through data
 * attributes, which is what lets the content render as a `div`, a `button` or an `a`
 * (via `asChild`) and still pick up the right hover treatment. `align="end"` pushes the
 * bubble to the right, the usual convention for the current user's own messages.
 */
const meta = {
  title: 'UI/Bubble',
  component: Bubble,
  args: { variant: 'default', align: 'start' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'],
    },
    align: { control: 'inline-radio', options: ['start', 'end'] },
  },
  render: (args) => (
    <Bubble {...args}>
      <BubbleContent>Shall we ship it on Friday?</BubbleContent>
    </Bubble>
  ),
} satisfies Meta<typeof Bubble>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Right-aligned, the convention for messages the current user sent. */
export const AlignEnd: Story = {
  args: { align: 'end' },
}

/** Every variant. `ghost` strips the background and padding entirely. */
export const Variants: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-3">
      {(
        ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const
      ).map((variant) => (
        <Bubble key={variant} variant={variant}>
          <BubbleContent>{variant}</BubbleContent>
        </Bubble>
      ))}
    </div>
  ),
}

/** `BubbleGroup` stacks bubbles in a column; alignment alternates per speaker. */
export const Conversation: Story = {
  render: () => (
    <BubbleGroup className="w-96">
      <Bubble variant="muted">
        <BubbleContent>Morning! Did the migration finish?</BubbleContent>
      </Bubble>
      <Bubble align="end">
        <BubbleContent>Yes — it landed at 03:12 and every check is green.</BubbleContent>
      </Bubble>
      <Bubble variant="muted">
        <BubbleContent>Perfect. I will start the rollout.</BubbleContent>
      </Bubble>
    </BubbleGroup>
  ),
}

/** `BubbleReactions` floats over the edge of the bubble; `side` and `align` position it. */
export const WithReactions: Story = {
  render: () => (
    <BubbleGroup className="w-96 gap-6">
      <Bubble variant="muted">
        <BubbleContent>The new onboarding flow is live.</BubbleContent>
        <BubbleReactions side="bottom" align="start">
          <span>🎉</span>
          <span>🚀</span>
        </BubbleReactions>
      </Bubble>
      <Bubble align="end">
        <BubbleContent>Nice work everyone.</BubbleContent>
        <BubbleReactions side="bottom" align="end">
          <span>👍 3</span>
        </BubbleReactions>
      </Bubble>
    </BubbleGroup>
  ),
}

/** `BubbleContent asChild` turns the bubble into a real button with hover and focus rings. */
export const Interactive: Story = {
  render: () => (
    <BubbleGroup className="w-96">
      <Bubble variant="outline">
        <BubbleContent asChild>
          <button type="button" onClick={fn()}>
            Retry sending this message
          </button>
        </BubbleContent>
      </Bubble>
      <Bubble variant="destructive" align="end">
        <BubbleContent asChild>
          <button type="button" onClick={fn()}>
            Failed to send. Tap to retry.
          </button>
        </BubbleContent>
      </Bubble>
    </BubbleGroup>
  ),
}
