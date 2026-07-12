import type { Meta, StoryObj } from '@storybook/react-vite'
import { CheckIcon, PlusIcon } from 'lucide-react'

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar'

const face = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="hsl(${hue} 60% 45%)"/><circle cx="40" cy="30" r="14" fill="hsl(${hue} 60% 80%)"/><circle cx="40" cy="78" r="26" fill="hsl(${hue} 60% 80%)"/></svg>`,
  )}`

/**
 * A user's picture, with a text fallback for when the image is missing or still loading.
 *
 * `AvatarFallback` is rendered by Radix only after the image fails or is absent, so the
 * initials never flash over a good image.
 */
const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  args: { size: 'default' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
  },
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src={face(220)} alt="Ada Lovelace" />
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** With no resolvable `src`, the initials take over. */
export const Fallback: Story = {
  render: (args) => (
    <Avatar {...args}>
      <AvatarImage src="" alt="Grace Hopper" />
      <AvatarFallback>GH</AvatarFallback>
    </Avatar>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {(['sm', 'default', 'lg'] as const).map((size) => (
        <Avatar key={size} size={size}>
          <AvatarImage src={face(220)} alt="Ada Lovelace" />
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
      ))}
    </div>
  ),
}

/**
 * `AvatarBadge` pins a dot to the bottom-right — an online indicator, or a small icon.
 * At `size="sm"` any icon inside it is hidden and only the dot remains.
 */
export const WithBadge: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="lg">
        <AvatarImage src={face(140)} alt="Alan Turing" />
        <AvatarFallback>AT</AvatarFallback>
        <AvatarBadge className="bg-emerald-500" />
      </Avatar>
      <Avatar size="lg">
        <AvatarImage src={face(300)} alt="Katherine Johnson" />
        <AvatarFallback>KJ</AvatarFallback>
        <AvatarBadge>
          <CheckIcon />
        </AvatarBadge>
      </Avatar>
    </div>
  ),
}

/** `AvatarGroup` overlaps avatars and rings them against the background. */
export const Group: Story = {
  render: () => (
    <AvatarGroup>
      {[220, 140, 300, 20].map((hue, i) => (
        <Avatar key={hue}>
          <AvatarImage src={face(hue)} alt={`Team member ${i + 1}`} />
          <AvatarFallback>U{i + 1}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  ),
}

/** `AvatarGroupCount` matches the group's avatar size and can hold an icon instead of a count. */
export const GroupWithAction: Story = {
  render: () => (
    <AvatarGroup>
      {[220, 140].map((hue, i) => (
        <Avatar key={hue} size="lg">
          <AvatarImage src={face(hue)} alt={`Team member ${i + 1}`} />
          <AvatarFallback>U{i + 1}</AvatarFallback>
        </Avatar>
      ))}
      <AvatarGroupCount>
        <PlusIcon />
      </AvatarGroupCount>
    </AvatarGroup>
  ),
}
