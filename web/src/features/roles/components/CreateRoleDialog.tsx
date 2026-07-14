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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CreateRoleInput } from '@/types/role'

export interface CreateRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The full permission vocabulary (e.g. "flag.read"), for the picker. */
  permissions: string[]
  /** Emitted with the new role's definition on submit. */
  onCreate: (input: CreateRoleInput) => void
  isCreating?: boolean
  errorMessage?: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleize(s: string): string {
  return s.split('_').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ')
}

/** Group permissions by their resource prefix ("flag.read" -> "flag"). */
function groupByResource(permissions: string[]): [string, string[]][] {
  const map = new Map<string, string[]>()
  for (const p of permissions) {
    const resource = p.split('.')[0] ?? p
    map.set(resource, [...(map.get(resource) ?? []), p])
  }
  return [...map.entries()]
}

/** Presentational. Create a custom role: name, key, scope, and a permission picker. */
export function CreateRoleDialog({
  open,
  onOpenChange,
  permissions,
  onCreate,
  isCreating,
  errorMessage,
}: CreateRoleDialogProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [scope, setScope] = useState<'organization' | 'project'>('project')
  const [selected, setSelected] = useState<string[]>([])

  function reset() {
    setName('')
    setKey('')
    setKeyEdited(false)
    setDescription('')
    setScope('project')
    setSelected([])
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  function toggle(perm: string) {
    setSelected((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]))
  }

  const canSubmit = name.trim() !== '' && key.trim() !== '' && selected.length > 0

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onCreate({ key, name, description: description.trim(), scope, permissions: selected })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>A named bundle of permissions to assign to members.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="QA"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-key">Key</Label>
            <Input
              id="role-key"
              value={key}
              onChange={(e) => {
                setKeyEdited(true)
                setKey(slugify(e.target.value))
              }}
              placeholder="qa"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Input
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label>Scope</Label>
            <Tabs value={scope} onValueChange={(v) => setScope(v as 'organization' | 'project')}>
              <TabsList>
                <TabsTrigger value="project">Project</TabsTrigger>
                <TabsTrigger value="organization">Organization</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {groupByResource(permissions).map(([resource, perms]) => (
              <div key={resource} className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold">{titleize(resource)}</p>
                {perms.map((perm) => {
                  const action = perm.split('.').slice(1).join('.')
                  return (
                    <label key={perm} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selected.includes(perm)}
                        onCheckedChange={() => toggle(perm)}
                      />
                      <span className="font-mono">{action}</span>
                    </label>
                  )
                })}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isCreating}>
              {isCreating ? 'Creating…' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
