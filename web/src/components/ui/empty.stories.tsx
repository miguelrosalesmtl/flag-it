import type { Meta, StoryObj } from '@storybook/react-vite'
import { FolderIcon, PlusIcon, SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'

const meta = {
  title: 'UI/Empty',
  component: Empty,
} satisfies Meta<typeof Empty>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Empty className="w-[28rem] border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderIcon />
        </EmptyMedia>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>
          Projects group your deployments and environments. Create one to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>
          <PlusIcon />
          New project
        </Button>
      </EmptyContent>
    </Empty>
  ),
}

/** Header only — no call to action. */
export const HeaderOnly: Story = {
  render: () => (
    <Empty className="w-[28rem] border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchIcon />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>Try a different search term or clear your filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

/** `EmptyContent` can hold any composition, such as a search box. */
export const WithSearch: Story = {
  render: () => (
    <Empty className="w-[28rem] border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchIcon />
        </EmptyMedia>
        <EmptyTitle>Nothing matched “analytics”</EmptyTitle>
        <EmptyDescription>
          Check the spelling, or search the docs instead. <a href="#empty">Browse all docs</a>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Input placeholder="Search again…" />
        <Button variant="outline">Clear filters</Button>
      </EmptyContent>
    </Empty>
  ),
}
