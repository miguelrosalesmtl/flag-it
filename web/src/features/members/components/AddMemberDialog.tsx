import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AddMemberInput } from '@/types/member'
import type { Role } from '@/types/role'

export interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Organization-scoped roles offered in the role dropdown. */
  roles: Role[]
  /** Emitted with the email + optional role on submit. */
  onAdd: (input: AddMemberInput) => void
  isAdding?: boolean
  errorMessage?: string
}

/** Presentational. A controlled dialog to add an existing user to the organization. */
export function AddMemberDialog({
  open,
  onOpenChange,
  roles,
  onAdd,
  isAdding,
  errorMessage,
}: AddMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setEmail('')
      setRole('')
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (email.trim()) onAdd({ email: email.trim(), role: role || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>Add an existing user to this organization.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-role">Role</Label>
            <select
              id="member-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={cn(
                'border-input bg-transparent h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              )}
            >
              <option value="">No role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!email.trim() || isAdding}>
              {isAdding ? 'Adding…' : 'Add member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
