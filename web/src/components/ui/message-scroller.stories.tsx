import type { Meta, StoryObj } from '@storybook/react-vite'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Message, MessageAvatar, MessageContent, MessageHeader } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const conversation: ChatMessage[] = [
  { id: 'm1', role: 'user', text: 'Morning — did the nightly build go through?' },
  {
    id: 'm2',
    role: 'assistant',
    text: 'It did not. The typecheck step failed on two modules that import a type removed in the last refactor.',
  },
  { id: 'm3', role: 'user', text: 'Which modules?' },
  {
    id: 'm4',
    role: 'assistant',
    text: 'src/lib/api-client.ts and src/features/billing/use-invoice.ts. Both still import InvoiceDraft from @/types/billing.',
  },
  {
    id: 'm5',
    role: 'user',
    text: 'Right, that got renamed to DraftInvoice. Can you fix the imports?',
  },
  {
    id: 'm6',
    role: 'assistant',
    text: 'Done — I updated both imports and the two call sites that destructured the old shape.',
  },
  { id: 'm7', role: 'user', text: 'Any tests covering that path?' },
  {
    id: 'm8',
    role: 'assistant',
    text: 'Only an integration test. I added a unit test for the draft serializer so the rename would have been caught earlier.',
  },
  { id: 'm9', role: 'user', text: 'Great. Push it and re-run the pipeline.' },
  {
    id: 'm10',
    role: 'assistant',
    text: 'Pushed to fix/draft-invoice-imports. The pipeline is green: typecheck, lint, and 214 tests all pass.',
  },
]

const meta = {
  title: 'UI/MessageScroller',
  component: MessageScroller,
} satisfies Meta<typeof MessageScroller>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <MessageScrollerProvider>
      <MessageScroller className="h-96 w-[30rem] rounded-lg border">
        <MessageScrollerViewport className="p-4">
          <MessageScrollerContent>
            {conversation.map((message) => (
              <MessageScrollerItem key={message.id} messageId={message.id}>
                {message.role === 'user' ? (
                  <Message align="end">
                    <MessageContent>
                      <Bubble align="end">
                        <BubbleContent>{message.text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                ) : (
                  <Message>
                    <MessageAvatar>
                      <Avatar>
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader>Assistant</MessageHeader>
                      <Bubble variant="muted">
                        <BubbleContent>{message.text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                )}
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="end" />
      </MessageScroller>
    </MessageScrollerProvider>
  ),
}

export const StartsAtTop: Story = {
  render: () => (
    <MessageScrollerProvider defaultScrollPosition="start">
      <MessageScroller className="h-96 w-[30rem] rounded-lg border">
        <MessageScrollerViewport className="p-4">
          <MessageScrollerContent>
            {conversation.map((message) => (
              <MessageScrollerItem key={message.id} messageId={message.id}>
                <Message align={message.role === 'user' ? 'end' : 'start'}>
                  <MessageContent>
                    <Bubble
                      align={message.role === 'user' ? 'end' : 'start'}
                      variant={message.role === 'user' ? 'default' : 'muted'}
                    >
                      <BubbleContent>{message.text}</BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="end" />
      </MessageScroller>
    </MessageScrollerProvider>
  ),
}
