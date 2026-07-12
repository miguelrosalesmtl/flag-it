import type { Meta, StoryObj } from '@storybook/react-vite'

import { Separator } from '@/components/ui/separator'

const meta = {
  title: 'UI/Separator',
  component: Separator,
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    decorative: { control: 'boolean' },
  },
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <div className="w-80">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm leading-none font-medium">Radix Primitives</h4>
        <p className="text-muted-foreground text-sm">An open-source UI component library.</p>
      </div>
      <Separator {...args} className="my-4" />
      <p className="text-muted-foreground text-sm">Content below the divider.</p>
    </div>
  ),
}

/** A vertical rule needs a parent with a defined height. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div className="flex h-6 items-center gap-4 text-sm">
      <span>Blog</span>
      <Separator {...args} />
      <span>Docs</span>
      <Separator {...args} />
      <span>Source</span>
    </div>
  ),
}

/** `decorative={false}` exposes the separator to assistive tech as a real divider. */
export const Semantic: Story = {
  args: { orientation: 'horizontal', decorative: false },
  render: (args) => (
    <div className="flex w-80 flex-col gap-4">
      <p className="text-sm">Section one</p>
      <Separator {...args} />
      <p className="text-sm">Section two</p>
    </div>
  ),
}
