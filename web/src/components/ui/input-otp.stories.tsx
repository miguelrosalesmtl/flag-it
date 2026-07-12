import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'

const meta = {
  title: 'UI/InputOTP',
  component: InputOTP,
  args: { maxLength: 6, children: null },
} satisfies Meta<typeof InputOTP>

export default meta
type Story = StoryObj<typeof meta>

/** Six slots, split into two groups by a separator. */
export const Default: Story = {
  render: () => (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  ),
}

/** One continuous group of six. */
export const SingleGroup: Story = {
  render: () => (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
}

/** Controlled value, restricted to digits, with an `onComplete` callback. */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState('')
    const [completed, setCompleted] = useState(false)

    return (
      <div className="flex flex-col items-center gap-3">
        <InputOTP
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={value}
          onChange={setValue}
          onComplete={() => setCompleted(true)}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <p className="text-muted-foreground text-sm">
          {completed ? `Submitted ${value}` : `Entered: ${value || '—'}`}
        </p>
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => (
    <InputOTP maxLength={4} disabled defaultValue="12">
      <InputOTPGroup>
        {[0, 1, 2, 3].map((index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
}

/** `aria-invalid` on the slots surfaces a bad code. */
export const Invalid: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-2">
      <InputOTP maxLength={4} defaultValue="1234">
        <InputOTPGroup>
          {[0, 1, 2, 3].map((index) => (
            <InputOTPSlot key={index} index={index} aria-invalid />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <p className="text-destructive text-sm">That code is incorrect.</p>
    </div>
  ),
}
