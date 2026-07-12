import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ArrowUpIcon, EyeIcon, EyeOffIcon, InfoIcon, SearchIcon } from 'lucide-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'

const meta = {
  title: 'UI/InputGroup',
  component: InputGroup,
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

/** An icon addon at the inline start, and a keyboard hint at the inline end. */
export const Default: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search components…" />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  ),
}

/** `InputGroupText` renders a static prefix or suffix. */
export const WithTextAddons: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="example.com" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="0.00" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
}

/** A button addon toggling password visibility. */
export const WithButton: Story = {
  render: function WithButtonStory() {
    const [visible, setVisible] = useState(false)

    return (
      <InputGroup className="w-80">
        <InputGroupInput
          type={visible ? 'text' : 'password'}
          defaultValue="correct-horse-battery"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    )
  },
}

/** A textarea control with a block-end toolbar. */
export const WithTextarea: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupTextarea placeholder="Ask a question…" rows={3} />
      <InputGroupAddon align="block-end" className="border-t">
        <InputGroupText>
          <InfoIcon />
          Shift + Enter for a new line
        </InputGroupText>
        <InputGroupButton size="icon-sm" variant="default" className="ml-auto" aria-label="Send">
          <ArrowUpIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

/** `aria-invalid` on the control turns the whole group destructive. */
export const Invalid: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput aria-invalid defaultValue="???" />
    </InputGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <InputGroup className="w-80" data-disabled>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search…" disabled />
    </InputGroup>
  ),
}
