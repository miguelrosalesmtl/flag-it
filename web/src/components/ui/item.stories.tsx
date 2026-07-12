import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDownIcon, FileTextIcon, ShieldIcon, UsersIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item'

const meta = {
  title: 'UI/Item',
  component: Item,
  argTypes: {
    variant: { control: 'select', options: ['default', 'outline', 'muted'] },
    size: { control: 'select', options: ['default', 'sm'] },
  },
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Item {...args} className="w-[28rem]">
      <ItemMedia variant="icon">
        <FileTextIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Design brief.pdf</ItemTitle>
        <ItemDescription>Updated 2 hours ago · 1.2 MB</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm" variant="outline">
          Open
        </Button>
      </ItemActions>
    </Item>
  ),
  args: { variant: 'outline' },
}

/** Every variant and size. */
export const Variants: Story = {
  render: () => (
    <div className="flex w-[28rem] flex-col gap-3">
      <Item variant="default">
        <ItemContent>
          <ItemTitle>Default</ItemTitle>
          <ItemDescription>Transparent background, no border.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Outline</ItemTitle>
          <ItemDescription>Bordered container.</ItemDescription>
        </ItemContent>
      </Item>
      <Item variant="muted" size="sm">
        <ItemContent>
          <ItemTitle>Muted, small</ItemTitle>
          <ItemDescription>Tighter padding.</ItemDescription>
        </ItemContent>
      </Item>
    </div>
  ),
}

/** `ItemGroup` + `ItemSeparator` build a list. */
export const Group: Story = {
  render: () => (
    <ItemGroup className="w-[28rem] rounded-lg border">
      <Item>
        <ItemMedia variant="icon">
          <UsersIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Team members</ItemTitle>
          <ItemDescription>Invite collaborators to this workspace.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronDownIcon className="text-muted-foreground size-4" />
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <ShieldIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Security</ItemTitle>
          <ItemDescription>Two-factor authentication and session policy.</ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronDownIcon className="text-muted-foreground size-4" />
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
}

/** With a header and footer row. */
export const HeaderAndFooter: Story = {
  render: () => (
    <Item variant="outline" className="w-[28rem]">
      <ItemHeader>
        <ItemTitle>Production deploy</ItemTitle>
        <Badge variant="secondary">Live</Badge>
      </ItemHeader>
      <ItemContent>
        <ItemDescription>
          Deployed from <code>main</code> by ada 12 minutes ago.
        </ItemDescription>
      </ItemContent>
      <ItemFooter>
        <span className="text-muted-foreground text-xs">commit 4f2a19c</span>
        <Button size="sm" variant="outline">
          View logs
        </Button>
      </ItemFooter>
    </Item>
  ),
}

/** `asChild` renders the item as a link. */
export const AsLink: Story = {
  render: () => (
    <Item asChild variant="outline" className="w-[28rem]">
      <a href="#item">
        <ItemMedia variant="icon">
          <FileTextIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Read the changelog</ItemTitle>
          <ItemDescription>The whole item is a clickable link.</ItemDescription>
        </ItemContent>
      </a>
    </Item>
  ),
}
