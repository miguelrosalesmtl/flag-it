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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CreateSdkKeyInput } from '@/types/sdk-key'

export interface CreateSdkKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Emitted with the kind + name on submit. */
  onCreate: (input: CreateSdkKeyInput) => void
  isCreating?: boolean
  errorMessage?: string
}

/** Presentational. A controlled dialog to mint an SDK key (server or client). */
export function CreateSdkKeyDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  errorMessage,
}: CreateSdkKeyDialogProps) {
  const [kind, setKind] = useState<'server' | 'client'>('server')
  const [name, setName] = useState('')

  function handleOpenChange(next: boolean) {
    if (!next) {
      setKind('server')
      setName('')
    }
    onOpenChange(next)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onCreate({ kind, name: name.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New SDK key</DialogTitle>
          <DialogDescription>
            Server keys are secret; client keys are public (browser/mobile).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label>Kind</Label>
            <Tabs value={kind} onValueChange={(v) => setKind(v as 'server' | 'client')}>
              <TabsList>
                <TabsTrigger value="server">Server</TabsTrigger>
                <TabsTrigger value="client">Client</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sdk-key-name">Name</Label>
            <Input
              id="sdk-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CI, mobile app"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
