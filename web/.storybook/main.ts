import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    // Prop tables + auto-generated docs pages, inferred from the TypeScript types.
    '@storybook/addon-docs',
    // Flags accessibility problems per story.
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    // Read prop docs straight from the TS types, so the Controls panel and the
    // props table stay in sync with the component without any manual upkeep.
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      // MUST point at tsconfig.app.json, not the root tsconfig. The root is a
      // solution-style file ("files": [] + references) and contains no sources,
      // so docgen would resolve nothing and silently fall back to inferring
      // controls from each story's `args` — quietly dropping any prop a story
      // does not happen to set.
      tsconfigPath: './tsconfig.app.json',
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      // Document our own props; skip the hundreds inherited from React's HTML types.
      propFilter: (prop) => !prop.parent || !/node_modules/.test(prop.parent.fileName),
    },
  },
}

export default config
