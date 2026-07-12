import type { Meta, StoryObj } from '@storybook/react-vite'
import { InfoIcon, SparklesIcon } from 'lucide-react'

import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'

const meta = {
  title: 'UI/Marker',
  component: Marker,
} satisfies Meta<typeof Marker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="w-96">
      <Marker>
        <MarkerIcon>
          <SparklesIcon />
        </MarkerIcon>
        <MarkerContent>Generated with Claude Opus 4.5 · 1,204 tokens</MarkerContent>
      </Marker>
    </div>
  ),
}

export const Separator: Story = {
  render: () => (
    <div className="w-96">
      <Marker variant="separator">
        <MarkerContent>Today</MarkerContent>
      </Marker>
    </div>
  ),
}

export const Border: Story = {
  render: () => (
    <div className="w-96">
      <Marker variant="border">
        <MarkerIcon>
          <InfoIcon />
        </MarkerIcon>
        <MarkerContent>3 files changed in this revision</MarkerContent>
      </Marker>
    </div>
  ),
}

export const AnnotatingProse: Story = {
  render: () => (
    <div className="flex w-[28rem] flex-col gap-4">
      <p className="text-sm leading-relaxed">
        The analytical engine has no pretensions whatever to originate anything. It can do whatever
        we know how to order it to perform. Its province is to assist us in making available what we
        are already acquainted with.
      </p>
      <Marker>
        <MarkerIcon>
          <InfoIcon />
        </MarkerIcon>
        <MarkerContent>
          Excerpted from Note G. <a href="#note-g">Read the full annotation</a>.
        </MarkerContent>
      </Marker>
      <Marker variant="separator">
        <MarkerContent>Earlier notes</MarkerContent>
      </Marker>
    </div>
  ),
}
