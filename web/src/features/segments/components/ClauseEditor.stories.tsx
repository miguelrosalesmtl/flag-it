import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { ClauseEditor } from '@/features/segments/components/ClauseEditor'
import type { Clause } from '@/types/segment'

const clause: Clause = { contextKind: 'user', attribute: 'country', op: 'in', values: ['US', 'CA'], negate: false }

const meta = {
  title: 'Segments/ClauseEditor',
  component: ClauseEditor,
  args: { clause, onChange: fn(), onRemove: fn() },
} satisfies Meta<typeof ClauseEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
