import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FlagWithState } from '@/types/flag'

export interface FlagListProps {
  /** Resolved flags with their on/off state in the selected environment. */
  flags: FlagWithState[]
  /** Emitted with a flag's key when its row is opened (to its detail view). */
  onOpen?: (key: string) => void
  /** Emitted with a flag's key + desired on-state when its switch is flipped. */
  onToggle?: (key: string, on: boolean) => void
  /** Key of the flag currently toggling; disables that row's switch. */
  togglingKey?: string | null
}

/**
 * Presentational. Lists a project's flags with a per-row on/off switch for the
 * selected environment. Flipping a switch only emits onToggle — the container
 * performs the change.
 */
export function FlagList({ flags, onOpen, onToggle, togglingKey }: FlagListProps) {
  if (flags.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No flags yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Variations</TableHead>
          <TableHead className="w-24 text-right">State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((flag) => (
          <TableRow key={flag.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {onOpen ? (
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => onOpen(flag.key)}
                  >
                    {flag.name || flag.key}
                  </button>
                ) : (
                  <span className="font-medium">{flag.name || flag.key}</span>
                )}
                {flag.client_side_available ? (
                  <Badge variant="secondary">Client-side</Badge>
                ) : null}
                {flag.temporary ? <Badge variant="outline">Temporary</Badge> : null}
              </div>
              {flag.description ? (
                <p className="text-muted-foreground text-sm">{flag.description}</p>
              ) : null}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-sm">{flag.key}</TableCell>
            <TableCell className="text-right tabular-nums">{flag.variations.length}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-muted-foreground text-xs">{flag.on ? 'On' : 'Off'}</span>
                <Switch
                  checked={flag.on}
                  onCheckedChange={(on) => onToggle?.(flag.key, on)}
                  disabled={!onToggle || togglingKey === flag.key}
                  aria-label={`Toggle ${flag.name || flag.key}`}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
