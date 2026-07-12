import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    value: 'shipping',
    question: 'How long does shipping take?',
    answer: 'Orders ship within one business day and usually arrive in three to five days.',
  },
  {
    value: 'returns',
    question: 'What is the return policy?',
    answer: 'Anything unused can be returned within 30 days for a full refund.',
  },
  {
    value: 'support',
    question: 'How do I reach support?',
    answer: 'Email support@example.com and a human replies within one business day.',
  },
]

const items = faqs.map((faq) => (
  <AccordionItem key={faq.value} value={faq.value}>
    <AccordionTrigger>{faq.question}</AccordionTrigger>
    <AccordionContent>{faq.answer}</AccordionContent>
  </AccordionItem>
))

/**
 * A vertically stacked set of headings that each reveal a panel.
 *
 * The `type` prop drives the behaviour: `single` keeps at most one panel open (add
 * `collapsible` to let the user close the open one), while `multiple` lets panels
 * open independently.
 */
const meta = {
  title: 'UI/Accordion',
  component: Accordion,
  args: {
    type: 'single',
    collapsible: true,
    className: 'w-full max-w-md',
  },
  render: (args) => <Accordion {...args}>{items}</Accordion>,
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Opening a panel closes the previous one, because `type="single"`. */
export const SingleCollapsible: Story = {
  args: { defaultValue: 'shipping' },
}

/** `type="multiple"` allows any number of panels to stay open at once. */
export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" defaultValue={['shipping', 'returns']} className="w-full max-w-md">
      {items}
    </Accordion>
  ),
}

/** Individual items can be disabled and keep their chevron but stop responding. */
export const WithDisabledItem: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="available">
        <AccordionTrigger>Available section</AccordionTrigger>
        <AccordionContent>This one opens and closes as usual.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="locked" disabled>
        <AccordionTrigger>Locked section</AccordionTrigger>
        <AccordionContent>You will never see this content.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
