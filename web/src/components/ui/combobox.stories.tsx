import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'

const frameworks = ['Next.js', 'SvelteKit', 'Nuxt.js', 'Remix', 'Astro']

const languages = ['TypeScript', 'Rust', 'Go', 'Python', 'Elixir', 'Zig']

type Group = { value: string; items: string[] }

const groups: Group[] = [
  { value: 'Frameworks', items: frameworks },
  { value: 'Languages', items: languages },
]

const meta = {
  title: 'UI/Combobox',
  component: Combobox,
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A filterable single-select. `items` on the root feeds both the filtering and the
 * render callback passed to `ComboboxList`.
 */
export const Default: Story = {
  render: () => (
    <Combobox items={frameworks}>
      <div className="flex w-64 flex-col gap-2">
        <Label htmlFor="framework">Framework</Label>
        <ComboboxInput id="framework" placeholder="e.g. Remix" />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        <ComboboxList>
          {(framework: string) => (
            <ComboboxItem key={framework} value={framework}>
              {framework}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
}

/** `defaultValue` preselects an item; `showClear` adds a button to reset it. */
export const WithClearButton: Story = {
  render: () => (
    <Combobox items={frameworks} defaultValue="Astro">
      <div className="w-64">
        <ComboboxInput placeholder="e.g. Remix" showClear />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        <ComboboxList>
          {(framework: string) => (
            <ComboboxItem key={framework} value={framework}>
              {framework}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
}

/**
 * Grouped items. The root takes `{ value, items }` groups, `ComboboxList` renders one
 * `ComboboxGroup` per group, and `ComboboxCollection` renders that group's items.
 */
export const Grouped: Story = {
  render: () => (
    <Combobox items={groups}>
      <div className="w-64">
        <ComboboxInput placeholder="Search everything…" />
      </div>
      <ComboboxContent>
        <ComboboxEmpty>Nothing matches.</ComboboxEmpty>
        <ComboboxList>
          {(group: Group) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
}

/**
 * `multiple` turns the value into an array. `ComboboxChips` renders the selection as
 * removable chips, and `useComboboxAnchor` keeps the popup anchored to the chip field
 * rather than to the (shrinking) input.
 */
function MultiSelectCombobox() {
  const anchor = useComboboxAnchor()

  return (
    <Combobox items={languages} multiple defaultValue={['TypeScript', 'Rust']}>
      <div className="flex w-72 flex-col gap-2">
        <Label>Languages</Label>
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(value: string[]) => (
              <>
                {value.map((language) => (
                  <ComboboxChip key={language} aria-label={language}>
                    {language}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={value.length > 0 ? '' : 'e.g. Go'} />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
      </div>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No language found.</ComboboxEmpty>
        <ComboboxList>
          {(language: string) => (
            <ComboboxItem key={language} value={language}>
              {language}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export const Multiple: Story = {
  render: () => <MultiSelectCombobox />,
}
