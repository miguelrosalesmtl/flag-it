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
import type { CreateFlagInput } from '@/types/flag'

export interface CreateFlagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Emitted with the new flag's key, name, and variations on submit. */
  onCreate: (input: CreateFlagInput) => void
  isCreating?: boolean
  errorMessage?: string
}

type FlagType = 'boolean' | 'string'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Presentational. Create a flag: name + key, and its variations — a boolean
 * (true/false) by default, or a set of string values. Emits the payload; the
 * container performs the write.
 */
export function CreateFlagDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  errorMessage,
}: CreateFlagDialogProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [keyEdited, setKeyEdited] = useState(false)
  const [type, setType] = useState<FlagType>('boolean')
  const [stringVars, setStringVars] = useState<string[]>(['', ''])
  const [temporary, setTemporary] = useState(false)

  function reset() {
    setName('')
    setKey('')
    setKeyEdited(false)
    setType('boolean')
    setStringVars(['', ''])
    setTemporary(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!keyEdited) setKey(slugify(value))
  }

  const cleanVars = stringVars.map((v) => v.trim()).filter(Boolean)
  const varsValid = type === 'boolean' || cleanVars.length >= 2
  const canSubmit = name.trim() !== '' && key.trim() !== '' && varsValid

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    const variations: unknown[] = type === 'boolean' ? [true, false] : cleanVars
    onCreate({ key, name, variations, temporary })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New flag</DialogTitle>
          <DialogDescription>
            A flag has two or more variations. It starts off in every environment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {errorMessage ? (
            <p role="alert" className="text-destructive text-sm">
              {errorMessage}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="flag-name">Name</Label>
            <Input
              id="flag-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Dark mode"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              value={key}
              onChange={(e) => {
                setKeyEdited(true)
                setKey(slugify(e.target.value))
              }}
              placeholder="dark-mode"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Variations</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as FlagType)}>
              <TabsList>
                <TabsTrigger value="boolean">Boolean</TabsTrigger>
                <TabsTrigger value="string">String</TabsTrigger>
              </TabsList>
            </Tabs>

            {type === 'boolean' ? (
              <p className="text-muted-foreground text-sm">
                Serves <span className="font-mono">true</span> or{' '}
                <span className="font-mono">false</span>.
              </p>
            ) : (
              <div className="space-y-2">
                {stringVars.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      aria-label={`Variation ${i + 1}`}
                      value={v}
                      onChange={(e) =>
                        setStringVars((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                      }
                      placeholder={`Variation ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove variation ${i + 1}`}
                      disabled={stringVars.length <= 2}
                      onClick={() => setStringVars((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStringVars((prev) => [...prev, ''])}
                >
                  Add variation
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="flag-temporary"
              checked={temporary}
              onCheckedChange={(v) => setTemporary(v === true)}
            />
            <Label htmlFor="flag-temporary" className="font-normal">
              Temporary flag (short-lived; flagged for cleanup once stale)
            </Label>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isCreating}>
              {isCreating ? 'Creating…' : 'Create flag'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
