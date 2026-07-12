import type { Meta, StoryObj } from '@storybook/react-vite'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  argTypes: {
    position: {
      control: 'select',
      options: [
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
    },
    richColors: { control: 'boolean' },
    expand: { control: 'boolean' },
    closeButton: { control: 'boolean' },
  },
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

/** Mount `<Toaster />` once, then call `toast()` from anywhere. */
export const Default: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-3">
      <Toaster {...args} />
      <Button variant="outline" onClick={() => toast('Event created')}>
        Show toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast('Event created', {
            description: 'Monday, January 3rd at 6:00pm',
          })
        }
      >
        With description
      </Button>
    </div>
  ),
}

/** Each status maps to one of the icons configured in `sonner.tsx`. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Toaster {...args} />
      <Button variant="outline" onClick={() => toast.success('Changes saved')}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error('Could not save changes')}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.warning('Your session expires soon')}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.info('A new version is available')}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.loading('Uploading…')}>
        Loading
      </Button>
    </div>
  ),
}

/** A toast can carry an action, and a promise toast resolves in place. */
export const WithActions: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Toaster {...args} />
      <Button
        variant="outline"
        onClick={() =>
          toast('Message archived', {
            action: { label: 'Undo', onClick: () => toast.success('Restored') },
          })
        }
      >
        Action button
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
            loading: 'Deploying…',
            success: 'Deployed to production',
            error: 'Deploy failed',
          })
        }
      >
        Promise
      </Button>
      <Button variant="outline" onClick={() => toast.dismiss()}>
        Dismiss all
      </Button>
    </div>
  ),
}

/** `richColors` tints each toast by status. */
export const RichColors: Story = {
  args: { richColors: true, closeButton: true },
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Toaster {...args} />
      <Button variant="outline" onClick={() => toast.success('Payment received')}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error('Card declined')}>
        Error
      </Button>
    </div>
  ),
}
