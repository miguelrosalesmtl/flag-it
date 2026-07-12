import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalculatorIcon,
  CalendarIcon,
  CreditCardIcon,
  SettingsIcon,
  SmileIcon,
  UserIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

const meta = {
  title: 'UI/Command',
  component: Command,
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

/** The palette body: typing in the input filters the items via cmdk. */
const paletteItems = (
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>
        <CalendarIcon />
        <span>Calendar</span>
      </CommandItem>
      <CommandItem>
        <SmileIcon />
        <span>Search emoji</span>
      </CommandItem>
      <CommandItem disabled>
        <CalculatorIcon />
        <span>Calculator</span>
      </CommandItem>
    </CommandGroup>
    <CommandSeparator />
    <CommandGroup heading="Settings">
      <CommandItem>
        <UserIcon />
        <span>Profile</span>
        <CommandShortcut>⌘P</CommandShortcut>
      </CommandItem>
      <CommandItem>
        <CreditCardIcon />
        <span>Billing</span>
        <CommandShortcut>⌘B</CommandShortcut>
      </CommandItem>
      <CommandItem>
        <SettingsIcon />
        <span>Settings</span>
        <CommandShortcut>⌘S</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  </CommandList>
)

/** Inline palette — filtering, grouping, disabled items and shortcuts. */
export const Default: Story = {
  render: () => (
    <Command className="w-80 rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      {paletteItems}
    </Command>
  ),
}

/** Seeded with a query that matches nothing, so `CommandEmpty` takes over. */
function EmptyPalette() {
  const [search, setSearch] = useState('nothing matches this')

  return (
    <Command className="w-80 rounded-lg border shadow-md">
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      {paletteItems}
    </Command>
  )
}

export const Empty: Story = {
  render: () => <EmptyPalette />,
}

/** `CommandDialog` drops the same palette into a modal — the ⌘K pattern. */
function CommandPalette() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        {paletteItems}
      </CommandDialog>
    </>
  )
}

export const InDialog: Story = {
  render: () => <CommandPalette />,
}
