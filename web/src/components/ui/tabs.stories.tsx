import type { Meta, StoryObj } from '@storybook/react-vite'
import { BellIcon, CreditCardIcon, UserIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

/** Account / password settings — the classic two-panel form. */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-96">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="grid gap-4 rounded-lg border p-4">
        <div className="grid gap-2">
          <Label htmlFor="tabs-name">Name</Label>
          <Input id="tabs-name" defaultValue="Ada Lovelace" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tabs-username">Username</Label>
          <Input id="tabs-username" defaultValue="@ada" />
        </div>
        <Button className="justify-self-start">Save changes</Button>
      </TabsContent>
      <TabsContent value="password" className="grid gap-4 rounded-lg border p-4">
        <div className="grid gap-2">
          <Label htmlFor="tabs-current">Current password</Label>
          <Input id="tabs-current" type="password" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tabs-new">New password</Label>
          <Input id="tabs-new" type="password" />
        </div>
        <Button className="justify-self-start">Update password</Button>
      </TabsContent>
    </Tabs>
  ),
}

/** Three tabs with leading icons. */
export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="profile" className="w-[26rem]">
      <TabsList>
        <TabsTrigger value="profile">
          <UserIcon />
          Profile
        </TabsTrigger>
        <TabsTrigger value="billing">
          <CreditCardIcon />
          Billing
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <BellIcon />
          Notifications
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="rounded-lg border p-4 text-sm">
        Your public profile is visible to everyone in the workspace.
      </TabsContent>
      <TabsContent value="billing" className="rounded-lg border p-4 text-sm">
        You are on the Team plan, billed annually. Next invoice: 1 Feb.
      </TabsContent>
      <TabsContent value="notifications" className="rounded-lg border p-4 text-sm">
        Choose how you hear from us. Email digests are on by default.
      </TabsContent>
    </Tabs>
  ),
}

/** The `line` list variant swaps the pill background for an underline. */
export const LineVariant: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[26rem]">
      <TabsList variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-2 text-sm">
        Revenue is up 12% week over week.
      </TabsContent>
      <TabsContent value="analytics" className="pt-2 text-sm">
        4,821 sessions in the last 7 days.
      </TabsContent>
      <TabsContent value="reports" className="pt-2 text-sm">
        Three scheduled reports run every Monday.
      </TabsContent>
    </Tabs>
  ),
}

/** Vertical orientation places the list beside the content. */
export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="general" orientation="vertical" className="w-[30rem]">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="rounded-lg border p-4 text-sm">
        Workspace name, URL and default language.
      </TabsContent>
      <TabsContent value="members" className="rounded-lg border p-4 text-sm">
        12 members, 2 pending invitations.
      </TabsContent>
      <TabsContent value="integrations" className="rounded-lg border p-4 text-sm">
        Connect GitHub, Slack and Linear.
      </TabsContent>
    </Tabs>
  ),
}

/** Individual triggers can be disabled. */
export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-[26rem]">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
        <TabsTrigger value="deleted" disabled>
          Deleted
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="rounded-lg border p-4 text-sm">
        8 active projects.
      </TabsContent>
      <TabsContent value="archived" className="rounded-lg border p-4 text-sm">
        23 archived projects.
      </TabsContent>
    </Tabs>
  ),
}
