import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SetupInput } from '@/types/setup'

export interface SetupWizardProps {
  /** Emitted once, with the whole payload, when the wizard is completed. */
  onSubmit: (input: SetupInput) => void
  /** Disables the wizard while the request is in flight. */
  isSubmitting?: boolean
  /** A message to surface on the final step (e.g. a server rejection). */
  errorMessage?: string
}

/** Derive a url-safe slug from a display name (best-effort; the field stays editable). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * First-run wizard. Step 1 creates the admin account, step 2 the first tenant.
 * All of it is local UI state — the payload only leaves the component, once, on
 * completion. The container decides what "complete" means.
 */
export function SetupWizard({ onSubmit, isSubmitting, errorMessage }: SetupWizardProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  // Track whether the user has hand-edited the slug; until then, mirror the name.
  const [slugEdited, setSlugEdited] = useState(false)

  const accountValid = email.trim() !== '' && password.length >= 8
  const tenantValid = tenantName.trim() !== '' && tenantSlug.trim() !== ''

  function handleTenantNameChange(value: string) {
    setTenantName(value)
    if (!slugEdited) setTenantSlug(slugify(value))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (step === 1) {
      if (accountValid) setStep(2)
      return
    }
    if (tenantValid) {
      onSubmit({
        email,
        password,
        full_name: fullName || undefined,
        tenant_name: tenantName,
        tenant_slug: tenantSlug,
      })
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to flag-it 🎉</CardTitle>
        <CardDescription>
          {step === 1
            ? "Let's set things up. First, create the owner account."
            : 'Now create your first tenant — an organization to hold projects.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="setup-name">Your name</Label>
                <Input
                  id="setup-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-email">Email</Label>
                <Input
                  id="setup-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-password">Password</Label>
                <Input
                  id="setup-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-muted-foreground text-xs">At least 8 characters.</p>
              </div>
              <Button type="submit" className="w-full" disabled={!accountValid}>
                Continue
              </Button>
            </>
          ) : (
            <>
              {errorMessage ? (
                <p role="alert" className="text-destructive text-sm">
                  {errorMessage}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="setup-tenant-name">Tenant name</Label>
                <Input
                  id="setup-tenant-name"
                  value={tenantName}
                  onChange={(e) => handleTenantNameChange(e.target.value)}
                  placeholder="Acme Inc"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-tenant-slug">Tenant slug</Label>
                <Input
                  id="setup-tenant-slug"
                  value={tenantSlug}
                  onChange={(e) => {
                    setSlugEdited(true)
                    setTenantSlug(slugify(e.target.value))
                  }}
                  placeholder="acme"
                  required
                />
                <p className="text-muted-foreground text-xs">Used in URLs. Lowercase, no spaces.</p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={!tenantValid || isSubmitting}>
                  {isSubmitting ? 'Setting up…' : 'Finish setup'}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
