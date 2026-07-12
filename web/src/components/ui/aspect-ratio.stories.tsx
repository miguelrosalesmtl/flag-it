import type { Meta, StoryObj } from '@storybook/react-vite'

import { AspectRatio } from '@/components/ui/aspect-ratio'

/**
 * Constrains its child to a fixed width-to-height ratio, so media reserves the right
 * amount of space before it loads and never causes layout shift.
 *
 * The width comes from the parent — `AspectRatio` only ever controls the height, which
 * is why every story wraps it in a sized container.
 */
const meta = {
  title: 'UI/AspectRatio',
  component: AspectRatio,
  args: { ratio: 16 / 9 },
  argTypes: {
    ratio: { control: { type: 'number', step: 0.05 } },
  },
  render: (args) => (
    <div className="w-96">
      <AspectRatio
        {...args}
        className="bg-muted text-muted-foreground flex items-center justify-center rounded-lg text-sm"
      >
        {args.ratio?.toFixed(2)}
      </AspectRatio>
    </div>
  ),
} satisfies Meta<typeof AspectRatio>

export default meta
type Story = StoryObj<typeof meta>

/** The default 16:9 — the usual choice for video and cover images. */
export const Default: Story = {}

export const Square: Story = { args: { ratio: 1 } }

/** Portrait media, e.g. a book cover or a phone screenshot. */
export const Portrait: Story = { args: { ratio: 3 / 4 } }

/** Ultrawide, e.g. a hero banner. */
export const Ultrawide: Story = { args: { ratio: 21 / 9 } }

/** Every child is clipped to the ratio, which makes it a reliable image frame. */
export const WithImage: Story = {
  render: () => (
    <div className="w-96">
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg">
        <div className="from-primary/60 to-primary/10 size-full bg-gradient-to-br" />
      </AspectRatio>
    </div>
  ),
}
