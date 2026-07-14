import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { CreateUserInput } from '@/types/user'

export interface CreateUserDialogProps {
  onCreate: (input: CreateUserInput) => void
  isCreating?: boolean
  errorMessage?: string
}

/** Presentational. Create a platform user. The container performs the write. */
export function CreateUserDialog({ onCreate, isCreating, errorMessage }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [superuser, setSuperuser] = useState(false)

  function handleOpenChange(next: boolean) {
    if (next) {
      setEmail('')
      setFullName('')
      setPassword('')
      setSuperuser(false)
    }
    setOpen(next)
  }

  const canSubmit = email.trim() !== '' && password.trim() !== ''

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onCreate({ email: email.trim(), password, full_name: fullName.trim(), is_superuser: superuser })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">New user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>Create a platform user account.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-name">Full name</Label>
            <Input
              id="user-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Password</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="user-superuser"
              checked={superuser}
              onCheckedChange={(v) => setSuperuser(v === true)}
            />
            <Label htmlFor="user-superuser" className="font-normal">
              Superuser (full cross-tenant access)
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isCreating}>
              {isCreating ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
