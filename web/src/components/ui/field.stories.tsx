import type { Meta, StoryObj } from '@storybook/react-vite'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const meta = {
  title: 'UI/Field',
  component: Field,
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal', 'responsive'] },
  },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Field {...args} className="w-80">
      <FieldLabel htmlFor="field-username">Username</FieldLabel>
      <Input id="field-username" placeholder="ada" />
      <FieldDescription>This is your public display name.</FieldDescription>
    </Field>
  ),
}

/** `FieldError` renders the destructive message; `data-invalid` tints the label. */
export const Invalid: Story = {
  render: () => (
    <Field data-invalid className="w-80">
      <FieldLabel htmlFor="field-email">Email</FieldLabel>
      <Input id="field-email" aria-invalid defaultValue="not-an-email" />
      <FieldError errors={[{ message: 'Enter a valid email address.' }]} />
    </Field>
  ),
}

/** Multiple errors collapse into a bulleted list. */
export const MultipleErrors: Story = {
  render: () => (
    <Field data-invalid className="w-80">
      <FieldLabel htmlFor="field-password">Password</FieldLabel>
      <Input id="field-password" type="password" aria-invalid defaultValue="abc" />
      <FieldError
        errors={[
          { message: 'Must be at least 8 characters.' },
          { message: 'Must contain a number.' },
        ]}
      />
    </Field>
  ),
}

/** Horizontal orientation, for switches and checkboxes. */
export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-80">
      <FieldContent>
        <FieldLabel htmlFor="field-marketing">Marketing emails</FieldLabel>
        <FieldDescription>Receive product news roughly once a month.</FieldDescription>
      </FieldContent>
      <Switch id="field-marketing" />
    </Field>
  ),
}

/** A full form section: `FieldSet` + `FieldLegend` + `FieldGroup`. */
export const FieldSetExample: Story = {
  name: 'FieldSet',
  render: () => (
    <FieldSet className="w-96">
      <FieldLegend>Profile</FieldLegend>
      <FieldDescription>How you appear to the rest of the team.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fieldset-name">Full name</FieldLabel>
          <Input id="fieldset-name" placeholder="Ada Lovelace" />
        </Field>
        <Field>
          <FieldLabel htmlFor="fieldset-bio">Bio</FieldLabel>
          <Textarea id="fieldset-bio" placeholder="Tell us a little about yourself" rows={3} />
          <FieldDescription>Markdown is supported.</FieldDescription>
        </Field>
        <FieldSeparator>Notifications</FieldSeparator>
        <Field orientation="horizontal">
          <Checkbox id="fieldset-digest" />
          <FieldContent>
            <FieldLabel htmlFor="fieldset-digest">Weekly digest</FieldLabel>
            <FieldDescription>A summary of activity, every Monday.</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}

/** A radio group, labelled with `FieldTitle` inside a nested field. */
export const RadioChoices: Story = {
  render: () => (
    <FieldSet className="w-96">
      <FieldLegend variant="label">Plan</FieldLegend>
      <RadioGroup defaultValue="pro">
        <FieldLabel htmlFor="plan-free">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Free</FieldTitle>
              <FieldDescription>One project, community support.</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="free" id="plan-free" />
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="plan-pro">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>Pro</FieldTitle>
              <FieldDescription>Unlimited projects, priority support.</FieldDescription>
            </FieldContent>
            <RadioGroupItem value="pro" id="plan-pro" />
          </Field>
        </FieldLabel>
      </RadioGroup>
    </FieldSet>
  ),
}
