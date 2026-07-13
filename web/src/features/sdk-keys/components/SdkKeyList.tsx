import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SdkKey } from '@/types/sdk-key'

export interface SdkKeyListProps {
  /** Resolved SDK keys for the selected environment. */
  keys: SdkKey[]
  /** Emitted with a key's id when it is revoked. */
  onRevoke?: (id: string) => void
  /** Id of the key currently being revoked; disables that row's button. */
  revokingId?: string | null
}

/** Presentational. Lists an environment's SDK keys with a revoke action. */
export function SdkKeyList({ keys, onRevoke, revokingId }: SdkKeyListProps) {
  if (keys.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        No SDK keys yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k.id}>
            <TableCell className="font-medium">{k.name || '—'}</TableCell>
            <TableCell>
              <Badge variant="secondary">{k.kind}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[22rem] truncate font-mono text-xs">
              {k.key}
            </TableCell>
            <TableCell className="text-right">
              {k.revoked_at ? (
                <span className="text-muted-foreground text-xs">Revoked</span>
              ) : onRevoke ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revokingId === k.id}
                  onClick={() => onRevoke(k.id)}
                >
                  Revoke
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
