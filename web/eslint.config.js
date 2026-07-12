import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Allow one layer to import a set of others.
 * Sugar over the boundaries v7 policy selector syntax.
 */
const layer = (from, allow) => ({
  from: { element: { types: from } },
  allow: { to: { element: { types: { anyOf: allow } } } },
})

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'storybook-static',
      'playwright-report',
      'test-results',
      'public',
    ],
  },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // ---------------------------------------------------------------------------
  // Architectural boundaries.
  //
  // This is the rule that keeps components dumb. The `component` and `ui` layers
  // cannot reach `api`, `store`, or `hook` — so a presentational component
  // physically cannot fetch or subscribe to global state. It takes props, it
  // emits callbacks, and that is all. Break it and CI goes red.
  //
  // Data flows one way:  api -> hook -> feature (container) -> component -> ui
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      // Without this, boundaries falls back to its bundled Node resolver, which
      // cannot follow the `@/*` path alias. Every internal import then looks
      // like a third-party package and EVERY rule below silently passes.
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['**/*.test.{ts,tsx}', '**/*.stories.tsx', '**/*.d.ts'],
      // Every pattern is a FOLDER pattern — this plugin classifies by directory,
      // not by filename. Order matters: the first match wins, so the most
      // specific paths come first.
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app', partialMatch: false },
        { type: 'config', pattern: 'src/config', partialMatch: false },
        { type: 'types', pattern: 'src/types', partialMatch: false },
        { type: 'lib', pattern: 'src/lib', partialMatch: false },
        { type: 'api', pattern: 'src/api/*', partialMatch: false },
        { type: 'api', pattern: 'src/api', partialMatch: false },
        { type: 'store', pattern: 'src/store', partialMatch: false },
        { type: 'mocks', pattern: 'src/mocks', partialMatch: false },
        { type: 'test', pattern: 'src/test', partialMatch: false },

        { type: 'ui', pattern: 'src/components/ui', partialMatch: false },
        // shadcn ships utility hooks (use-mobile) that its own primitives import.
        // They are part of the UI layer, not the data layer.
        { type: 'ui-hook', pattern: 'src/hooks', partialMatch: false },
        { type: 'component', pattern: 'src/components', partialMatch: false },
        { type: 'component', pattern: 'src/features/*/components', partialMatch: false },
        { type: 'hook', pattern: 'src/features/*/hooks', partialMatch: false },
        { type: 'feature', pattern: 'src/features/*', partialMatch: false },
      ],
    },
    rules: {
      // A source file that matches no element is a HOLE: the dependency rule
      // below has nothing to check it against, so imports to and from it pass
      // silently. That is how `src/hooks/` (added by the shadcn CLI) slipped in
      // unchecked. Fail instead — every .ts/.tsx under src must be classified.
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'Layer "{{from.type}}" may not import layer "{{to.type}}". See the dependency matrix in eslint.config.js.',
          policies: [
            // `types` is in almost every allow-list: pure types, zero runtime.
            // It is the shared vocabulary that lets any layer name a domain
            // entity without reaching for the layer that fetches it.

            // Composition root: wires everything together. It may pull in the
            // MSW worker to boot dev-mode mocking.
            layer('app', [
              'app',
              'feature',
              'component',
              'ui',
              'hook',
              'store',
              'lib',
              'types',
              'mocks',
              'config',
            ]),

            // Containers: the ONLY place that may pair data with presentation.
            layer('feature', [
              'feature',
              'hook',
              'store',
              'component',
              'ui',
              'lib',
              'types',
              'config',
            ]),

            // Query/mutation hooks: the ONLY bridge from the UI to the data layer.
            layer('hook', ['api', 'store', 'lib', 'types', 'config']),

            // Presentational. Props in, callbacks out. No data access. Ever.
            layer('component', ['component', 'ui', 'ui-hook', 'lib', 'types']),
            layer('ui', ['ui', 'ui-hook', 'lib', 'types']),
            layer('ui-hook', ['ui-hook', 'lib', 'types']),

            // Data layer: transport and client state know nothing about React.
            layer('api', ['api', 'lib', 'types', 'config']),
            layer('store', ['store', 'lib', 'types', 'config']),

            layer('lib', ['lib', 'types']),
            layer('types', ['types']),
            layer('config', ['types']),

            // Fixtures describe domain entities; they never import app code.
            layer('mocks', ['mocks', 'types', 'lib']),

            // Test helpers may reach anywhere.
            layer('test', [
              'app',
              'feature',
              'hook',
              'component',
              'ui',
              'api',
              'store',
              'lib',
              'types',
              'mocks',
              'config',
              'test',
            ]),
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Configuration is read in exactly one place.
  //
  // `import.meta.env` is BUILD-time: whatever it holds is string-replaced into
  // the bundle, which is precisely what the build-once/deploy-anywhere model is
  // trying to avoid. Real config comes from `getConfig()`, which is validated
  // from /config.json at boot.
  //
  // Vite's own DEV / PROD / MODE / SSR / BASE_URL flags stay allowed: they are
  // build-time BY DESIGN, and they are how Vite dead-code-strips things like MSW
  // and the devtools out of a production bundle. What is banned is reading a
  // custom VITE_* variable, which is exactly the environment config that must
  // not be frozen into the artifact.
  // ---------------------------------------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/config/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.object.type='MetaProperty'][object.property.name='env']:not([property.name=/^(DEV|PROD|MODE|SSR|BASE_URL)$/])",
          message:
            'Do not read custom import.meta.env vars — they are baked into the bundle at build time, which breaks build-once/deploy-anywhere. Use getConfig() from @/config/env instead (validated from /config.json at boot).',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Vendored code: `src/components/ui/**` and `src/hooks/**` are generated by the
  // shadcn CLI and are meant to be REGENERATED, not hand-edited (`shadcn add
  // <name> --overwrite` pulls upstream fixes). So we do not lint them as if we
  // wrote them:
  //
  //   - only-export-components: shadcn colocates cva variants with the component.
  //   - react-hooks/* : upstream carousel, sidebar and use-mobile trip the React
  //     Compiler rules. Patching them here would be undone by the next update.
  //   - no-unused-vars: upstream combobox has an unused `children` param.
  //
  // Anything WE write lives in src/components/*.tsx (see error-state.tsx) and is
  // held to the full rule set.
  // ---------------------------------------------------------------------------
  {
    files: ['src/components/ui/**', 'src/hooks/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
