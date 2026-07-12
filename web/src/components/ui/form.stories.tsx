import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useForm } from 'react-hook-form'
import { fn } from 'storybook/test'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const profileSchema = z.object({
  username: z
    .string()
    .min(2, { message: 'Username must be at least 2 characters.' })
    .max(20, { message: 'Username must be at most 20 characters.' }),
  email: z.email({ message: 'Enter a valid email address.' }),
})

type ProfileValues = z.infer<typeof profileSchema>

const onSubmit = fn()

type ProfileFormProps = {
  /** Seeds the form. Combine with `validateOnMount` to show an error state. */
  defaultValues?: ProfileValues
  /** Runs validation as soon as the form mounts. */
  validateOnMount?: boolean
}

/**
 * A small `react-hook-form` + `zod` form wired through the `Form*` primitives.
 * `FormField` takes a render prop and hands you the `field` bindings to spread
 * onto the control.
 */
function ProfileForm({
  defaultValues = { username: '', email: '' },
  validateOnMount = false,
}: ProfileFormProps) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  })

  useEffect(() => {
    if (validateOnMount) {
      void form.trigger()
    }
  }, [form, validateOnMount])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="w-80 space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="ada" {...field} />
              </FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ada@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save profile</Button>
      </form>
    </Form>
  )
}

const meta = {
  title: 'UI/Form',
  component: ProfileForm,
} satisfies Meta<typeof ProfileForm>

export default meta
type Story = StoryObj<typeof meta>

/** Empty form. Submit it to see the resolver reject both fields. */
export const Default: Story = {}

/** Validation errors, surfaced by `FormMessage` and the destructive `FormLabel`. */
export const WithValidationErrors: Story = {
  args: {
    defaultValues: { username: 'a', email: 'not-an-email' },
    validateOnMount: true,
  },
}

/** A single invalid field; the valid one stays neutral. */
export const SingleFieldError: Story = {
  args: {
    defaultValues: { username: 'ada', email: 'ada@' },
    validateOnMount: true,
  },
}
