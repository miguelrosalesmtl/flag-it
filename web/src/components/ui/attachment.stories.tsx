import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileTextIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { fn } from 'storybook/test'

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Spinner } from '@/components/ui/spinner'

const preview = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/></svg>',
)}`

/**
 * A file chip for uploads, chat composers and message lists.
 *
 * `state` drives the whole appearance through data attributes: `uploading` and
 * `processing` shimmer the title, `error` tints the media and description red, `idle`
 * gives the card a dashed border, and `done` is the settled default.
 */
const meta = {
  title: 'UI/Attachment',
  component: Attachment,
  args: {
    state: 'done',
    size: 'default',
    orientation: 'horizontal',
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['idle', 'uploading', 'processing', 'error', 'done'],
    },
    size: { control: 'select', options: ['default', 'sm', 'xs'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  render: (args) => (
    <Attachment {...args}>
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>quarterly-report.pdf</AttachmentTitle>
        <AttachmentDescription>248 KB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove attachment" onClick={fn()}>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
} satisfies Meta<typeof Attachment>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Swap the media icon for a `Spinner` while bytes are in flight; the title shimmers. */
export const Uploading: Story = {
  args: { state: 'uploading' },
  render: (args) => (
    <Attachment {...args}>
      <AttachmentMedia>
        <Spinner />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>quarterly-report.pdf</AttachmentTitle>
        <AttachmentDescription>Uploading… 62%</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Cancel upload" onClick={fn()}>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
}

/** `state="error"` turns the border, media tile and description destructive. */
export const Error: Story = {
  args: { state: 'error' },
  render: (args) => (
    <Attachment {...args}>
      <AttachmentMedia>
        <TriangleAlertIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>quarterly-report.pdf</AttachmentTitle>
        <AttachmentDescription>Upload failed — file too large</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove attachment" onClick={fn()}>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
}

/** `AttachmentMedia variant="image"` shows a thumbnail instead of an icon. */
export const ImagePreview: Story = {
  render: (args) => (
    <Attachment {...args}>
      <AttachmentMedia variant="image">
        <img src={preview} alt="" />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>hero-banner.png</AttachmentTitle>
        <AttachmentDescription>1.2 MB · 2400×1200</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
}

/** The vertical orientation makes a card-shaped chip, with actions pinned to the corner. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <Attachment {...args}>
      <AttachmentMedia variant="image">
        <img src={preview} alt="" />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>hero-banner.png</AttachmentTitle>
        <AttachmentDescription>1.2 MB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove attachment" onClick={fn()}>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
}

/** The three sizes, which scale the media tile, padding and type together. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      {(['default', 'sm', 'xs'] as const).map((size) => (
        <Attachment key={size} size={size}>
          <AttachmentMedia>
            <FileTextIcon />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>quarterly-report.pdf</AttachmentTitle>
            <AttachmentDescription>248 KB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      ))}
    </div>
  ),
}

/** `AttachmentTrigger` covers the card with a button, so the whole chip is clickable. */
export const Clickable: Story = {
  render: (args) => (
    <Attachment {...args}>
      <AttachmentTrigger aria-label="Open quarterly-report.pdf" onClick={fn()} />
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>quarterly-report.pdf</AttachmentTitle>
        <AttachmentDescription>Click anywhere to open</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction aria-label="Remove attachment" onClick={fn()}>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
}

/** `AttachmentGroup` lays chips out in a horizontal, snapping, scrollable row. */
export const Group: Story = {
  render: () => (
    <AttachmentGroup className="w-100">
      <Attachment orientation="vertical">
        <AttachmentMedia variant="image">
          <img src={preview} alt="" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>hero-banner.png</AttachmentTitle>
          <AttachmentDescription>1.2 MB</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment orientation="vertical" state="uploading">
        <AttachmentMedia>
          <Spinner />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>notes.md</AttachmentTitle>
          <AttachmentDescription>Uploading…</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
      <Attachment orientation="vertical" state="error">
        <AttachmentMedia>
          <TriangleAlertIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>archive.zip</AttachmentTitle>
          <AttachmentDescription>Failed</AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    </AttachmentGroup>
  ),
}
