import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { IndividualTargets } from '@/features/flags/components/IndividualTargets'
import type { Target } from '@/types/flag'

const targets: Target[] = [{ contextKind: 'user', variation: 0, values: ['user-1', 'user-2'] }]

const meta = {
  title: 'Flags/IndividualTargets',
  component: IndividualTargets,
  args: { variations: [true, false], targets, onAdd: fn(), onRemove: fn() },
} satisfies Meta<typeof IndividualTargets>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { args: { targets: [] } }

export const AddingATargetEmits: Story = {
  args: { targets: [] },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByPlaceholderText('Context key'), 'user-9')
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }))
    await expect(args.onAdd).toHaveBeenCalledWith(0, 'user-9')
  },
}
