import type { Preview } from '@storybook/react-vite'

import '../src/index.css'

const preview: Preview = {
  // Every component gets an auto-generated "Docs" page with a live props table,
  // derived from its TypeScript types. Nothing to maintain by hand.
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
      expanded: true,
    },
    options: {
      storySort: {
        order: ['Overview', 'UI', 'Users'],
      },
    },
  },
  decorators: [
    (Story) => {
      document.documentElement.classList.add('dark')
      return Story()
    },
  ],
}

export default preview
