import type { Meta, StoryObj } from '@storybook/react-vite'

import { ExpectedVariationsTable } from '@/features/contexts/components/ExpectedVariationsTable'
import type { ContextEvaluation } from '@/types/context'

const evaluations: ContextEvaluation[] = [
  { flag_key: 'dark-mode', variation: 0, value: true, reason: 'FALLTHROUGH' },
  { flag_key: 'pricing-tier', variation: 1, value: 'pro', reason: 'RULE_MATCH' },
]

const meta = {
  title: 'Contexts/ExpectedVariationsTable',
  component: ExpectedVariationsTable,
} satisfies Meta<typeof ExpectedVariationsTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { evaluations } }
export const Empty: Story = { args: { evaluations: [] } }
