import type { Meta, StoryObj } from '@storybook/react-vite'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from '@/components/ui/message'

const meta = {
  title: 'UI/Message',
  component: Message,
} satisfies Meta<typeof Message>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="w-[28rem]">
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>
              Sure — I can walk you through it. Which part would you like to start with?
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </div>
  ),
}

export const Outgoing: Story = {
  render: () => (
    <div className="w-[28rem]">
      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent>Can you summarize the deploy failure for me?</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </div>
  ),
}

export const Conversation: Story = {
  render: () => (
    <div className="flex w-[28rem] flex-col gap-8">
      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent>Can you summarize the deploy failure for me?</BubbleContent>
          </Bubble>
          <MessageFooter>Sent 9:41 AM</MessageFooter>
        </MessageContent>
      </Message>

      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Assistant</MessageHeader>
          <MessageGroup>
            <Bubble variant="muted">
              <BubbleContent>
                The build failed in the <code>typecheck</code> step: two modules import a type that
                no longer exists after the last refactor.
              </BubbleContent>
            </Bubble>
            <Bubble variant="muted">
              <BubbleContent>Want me to open a PR that updates the imports?</BubbleContent>
            </Bubble>
          </MessageGroup>
          <MessageFooter>Answered in 1.2s</MessageFooter>
        </MessageContent>
      </Message>

      <Message align="end">
        <MessageContent>
          <Bubble align="end">
            <BubbleContent>Yes please, and add a test.</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    </div>
  ),
}

export const WithHeaderAndFooter: Story = {
  render: () => (
    <div className="w-[28rem]">
      <Message>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent>
          <MessageHeader>Ada Lovelace</MessageHeader>
          <Bubble variant="outline">
            <BubbleContent>
              The analytical engine has no pretensions whatever to originate anything.
            </BubbleContent>
          </Bubble>
          <MessageFooter>Edited · 2 min ago</MessageFooter>
        </MessageContent>
      </Message>
    </div>
  ),
}
