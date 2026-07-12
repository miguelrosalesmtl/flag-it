import type { Meta, StoryObj } from '@storybook/react-vite'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

const meta = {
  title: 'UI/Resizable',
  component: ResizablePanelGroup,
  decorators: [
    (Story) => (
      <div className="h-96 w-full max-w-3xl overflow-hidden rounded-lg border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResizablePanelGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Two panels side by side. Drag the divider to resize. */
export const Default: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="40%" minSize="20%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-medium">Left</span>
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="60%" minSize="20%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-medium">Right</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

/** `withHandle` renders a visible grip on the separator. */
export const WithHandle: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="50%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-medium">One</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="50%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-medium">Two</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

/** Stacked panels via `orientation="vertical"`. */
export const Vertical: Story = {
  render: () => (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize="35%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-medium">Editor</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="65%">
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-medium">Terminal</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

/** Three panels: a sidebar plus a nested vertical split. */
export const ThreePanelLayout: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal">
      <ResizablePanel defaultSize="25%" minSize="15%">
        <div className="flex h-full flex-col gap-2 p-4">
          <span className="text-muted-foreground text-xs font-medium">Files</span>
          <span className="text-sm">index.ts</span>
          <span className="text-sm">app.tsx</span>
          <span className="text-sm">utils.ts</span>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="75%">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel defaultSize="70%">
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-medium">Source</span>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="30%" minSize="10%">
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-medium">Output</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}
