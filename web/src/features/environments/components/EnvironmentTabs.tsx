import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Environment } from '@/types/environment'

export interface EnvironmentTabsProps {
  /** Resolved environments. Never undefined — the container waits for the data. */
  environments: Environment[]
  /** The currently selected environment key. */
  selectedKey: string
  /** Emitted with an environment key when a tab is chosen. */
  onSelect: (key: string) => void
}

/** Presentational. A controlled tab strip for picking an environment. */
export function EnvironmentTabs({ environments, selectedKey, onSelect }: EnvironmentTabsProps) {
  return (
    <Tabs value={selectedKey} onValueChange={onSelect}>
      <TabsList>
        {environments.map((env) => (
          <TabsTrigger key={env.id} value={env.key}>
            {env.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
