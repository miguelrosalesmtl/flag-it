import type { Meta, StoryObj } from '@storybook/react-vite'

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const tags = Array.from({ length: 40 }, (_, index) => `v1.2.0-beta.${40 - index}`)

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

/** Vertical scrolling inside a fixed height. */
export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-64 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm leading-none font-medium">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

/** Horizontal scrolling requires an explicit `ScrollBar orientation="horizontal"`. */
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 rounded-md border whitespace-nowrap">
      <div className="flex w-max gap-4 p-4">
        {Array.from({ length: 12 }, (_, index) => (
          <figure key={index} className="shrink-0">
            <div className="bg-muted flex h-32 w-32 items-center justify-center rounded-md text-2xl font-semibold">
              {index + 1}
            </div>
            <figcaption className="text-muted-foreground pt-2 text-xs">
              Photo {index + 1}
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}

/** A long prose block clipped to a small viewport. */
export const Prose: Story = {
  render: () => (
    <ScrollArea className="h-48 w-80 rounded-md border p-4">
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        {Array.from({ length: 8 }, (_, index) => (
          <p key={index}>
            Paragraph {index + 1}. The scroll area constrains its content to a fixed height and
            renders a styled scrollbar in place of the browser default.
          </p>
        ))}
      </div>
    </ScrollArea>
  ),
}
