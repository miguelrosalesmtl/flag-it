import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'

import { RuleForm } from '@/features/flags/components/RuleForm'

const meta = {
  title: 'Flags/RuleForm',
  component: RuleForm,
  args: { variations: [true, false], submitLabel: 'Add rule', onSubmit: fn() },
} satisfies Meta<typeof RuleForm>

export default meta
type Story = StoryObj<typeof meta>

export const NewRule: Story = {}

export const EditingRule: Story = {
  args: {
    submitLabel: 'Save',
    onCancel: fn(),
    initialClauses: [{ contextKind: 'user', attribute: 'plan', op: 'in', values: ['pro'], negate: false }],
    initialServe: { rollout: { variations: [{ variation: 0, weight: 70000 }, { variation: 1, weight: 30000 }] } },
  },
}
