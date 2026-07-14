import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/role'

export interface GrantProjectRoleDialogProps {
  /** The project the grant applies to, for the copy. */
  projectKey: string
  /** Project-scoped roles offered in the dropdown. */
  roles: Role[]
  /** Emitted with the user's email + the chosen project role key. */
  onGrant: (input: { email: string; role: string }) => void
  isGranting?: boolean
  errorMessage?: string
}

/**
 * Presentational. Grant a user a project-scoped role — access to a single
 * project, distinct from tenant-wide membership.
 */
export function GrantProjectRoleDialog({
  projectKey,
  roles,
  onGrant,
  isGranting,
  errorMessage,
}: GrantProjectRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  function handleOpenChange(next: boolean) {
    if (next) {
      setEmail('')
      setRole('')
    }
    setOpen(next)
  }

  const canSubmit = email.trim() !== '' && role !== ''

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onGrant({ email: email.trim(), role })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Grant project role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant project role</DialogTitle>
          <DialogDescription>
            Give a user a role on <span className="font-mono">{projectKey}</span> only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="grant-email">Email</Label>
            <Input
              id="grant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grant-role">Role</Label>
            <select
              id="grant-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={cn(
                'border-input bg-transparent h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              )}
            >
              <option value="">Select a role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isGranting}>
              {isGranting ? 'Granting…' : 'Grant role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
