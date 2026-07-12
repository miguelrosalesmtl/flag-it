import type { Meta, StoryObj } from '@storybook/react-vite'
import { BookOpenIcon, CircleHelpIcon, LayersIcon } from 'lucide-react'

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'

const components = [
  {
    title: 'Alert Dialog',
    href: '#alert-dialog',
    description: 'A modal dialog that interrupts the user with important content.',
  },
  {
    title: 'Hover Card',
    href: '#hover-card',
    description: 'For sighted users to preview content available behind a link.',
  },
  {
    title: 'Progress',
    href: '#progress',
    description: 'Displays an indicator showing the completion progress of a task.',
  },
  {
    title: 'Tabs',
    href: '#tabs',
    description: 'Layered sections of content displayed one panel at a time.',
  },
]

const meta = {
  title: 'UI/NavigationMenu',
  component: NavigationMenu,
} satisfies Meta<typeof NavigationMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex min-h-64 justify-center">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[24rem] gap-2 md:grid-cols-2">
                <li>
                  <NavigationMenuLink href="#introduction">
                    <div className="font-medium">Introduction</div>
                    <p className="text-muted-foreground">
                      Re-usable components built with Radix and Tailwind.
                    </p>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#installation">
                    <div className="font-medium">Installation</div>
                    <p className="text-muted-foreground">
                      How to install dependencies and structure your app.
                    </p>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#theming">
                    <div className="font-medium">Theming</div>
                    <p className="text-muted-foreground">Tokens, dark mode, and CSS variables.</p>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#cli">
                    <div className="font-medium">CLI</div>
                    <p className="text-muted-foreground">Add components from the command line.</p>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Components</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[24rem] gap-2 md:grid-cols-2">
                {components.map((component) => (
                  <li key={component.title}>
                    <NavigationMenuLink href={component.href}>
                      <div className="font-medium">{component.title}</div>
                      <p className="text-muted-foreground">{component.description}</p>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#docs" className={navigationMenuTriggerStyle()}>
              Documentation
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <div className="flex min-h-64 justify-center">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-64 gap-1">
                <li>
                  <NavigationMenuLink href="#guides" className="flex-row items-center gap-2">
                    <BookOpenIcon />
                    Guides
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#examples" className="flex-row items-center gap-2">
                    <LayersIcon />
                    Examples
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#support" className="flex-row items-center gap-2">
                    <CircleHelpIcon />
                    Support
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#pricing" className={navigationMenuTriggerStyle()}>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  ),
}

export const WithoutViewport: Story = {
  render: () => (
    <div className="flex min-h-64 justify-center">
      <NavigationMenu viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Product</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-56 gap-1">
                <li>
                  <NavigationMenuLink href="#overview">Overview</NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#changelog">Changelog</NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="#roadmap">Roadmap</NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="#blog" className={navigationMenuTriggerStyle()}>
              Blog
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  ),
}
