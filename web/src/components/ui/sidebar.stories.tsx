import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarIcon,
  ChevronRightIcon,
  HomeIcon,
  InboxIcon,
  LifeBuoyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'

type NavItem = {
  title: string
  icon: LucideIcon
  isActive?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  { title: 'Home', icon: HomeIcon, isActive: true },
  { title: 'Inbox', icon: InboxIcon, badge: '12' },
  { title: 'Calendar', icon: CalendarIcon },
  { title: 'Team', icon: UsersIcon },
  { title: 'Settings', icon: SettingsIcon },
]

const projects = ['Design system', 'Marketing site', 'Mobile app']

/**
 * Every sidebar must be wrapped in a `SidebarProvider`, which owns the open/collapsed
 * state and the ⌘B keyboard shortcut. Below the `md` breakpoint the sidebar renders as a
 * `Sheet` instead — resize the canvas to see it.
 */
const meta = {
  title: 'UI/Sidebar',
  component: Sidebar,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    side: { control: 'inline-radio', options: ['left', 'right'] },
    variant: { control: 'inline-radio', options: ['sidebar', 'floating', 'inset'] },
    collapsible: { control: 'inline-radio', options: ['offcanvas', 'icon', 'none'] },
  },
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

function AppShell({ ...args }: ComponentProps<typeof Sidebar>) {
  return (
    <SidebarProvider>
      <Sidebar {...args}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" tooltip="Acme Inc.">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <LifeBuoyIcon className="size-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">Acme Inc.</span>
                  <span className="text-sidebar-foreground/70 text-xs">Enterprise</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarInput placeholder="Search…" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton isActive={item.isActive} tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarGroupAction title="Add project">
              <PlusIcon />
              <span className="sr-only">Add project</span>
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.map((project) => (
                  <SidebarMenuItem key={project}>
                    <SidebarMenuButton tooltip={project}>
                      <ChevronRightIcon />
                      <span>{project}</span>
                    </SidebarMenuButton>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontalIcon />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Archive">
                    <SearchIcon />
                    <span>Archive</span>
                  </SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#2023">2023</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#2024" isActive>
                        2024
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Support">
                <LifeBuoyIcon />
                <span>Support</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            {['Revenue', 'Active users', 'Churn'].map((label) => (
              <div key={label} className="rounded-xl border p-4">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="text-2xl font-semibold">—</p>
              </div>
            ))}
          </div>
          <div className="min-h-64 flex-1 rounded-xl border" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** The default off-canvas sidebar: toggling hides it entirely. */
export const Default: Story = {
  render: (args) => <AppShell {...args} />,
}

/** `collapsible="icon"` shrinks to an icon rail; tooltips appear when collapsed. */
export const CollapsibleIcon: Story = {
  args: { collapsible: 'icon' },
  render: (args) => <AppShell {...args} />,
}

/** `variant="floating"` detaches the sidebar into a rounded, bordered card. */
export const Floating: Story = {
  args: { variant: 'floating', collapsible: 'icon' },
  render: (args) => <AppShell {...args} />,
}

/** `variant="inset"` insets the main content, letting the page background show through. */
export const Inset: Story = {
  args: { variant: 'inset', collapsible: 'icon' },
  render: (args) => <AppShell {...args} />,
}

/** Anchored to the right edge. */
export const RightSide: Story = {
  args: { side: 'right', collapsible: 'icon' },
  render: (args) => <AppShell {...args} />,
}

/** `collapsible="none"` pins the sidebar open — no trigger, no rail. */
export const NonCollapsible: Story = {
  args: { collapsible: 'none' },
  render: (args) => <AppShell {...args} />,
}

/** Placeholder rows for a menu that is still loading. */
export const Loading: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarInput placeholder="Search…" disabled />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 6 }, (_, index) => (
                  <SidebarMenuItem key={index}>
                    <SidebarMenuSkeleton showIcon />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">Loading…</span>
        </header>
      </SidebarInset>
    </SidebarProvider>
  ),
}
