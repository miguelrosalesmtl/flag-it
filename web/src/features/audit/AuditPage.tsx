import { useState } from 'react'
import { useParams } from 'react-router'

import { ErrorState } from '@/components/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditList } from '@/features/audit/components/AuditList'
import { useAudit } from '@/features/audit/hooks/useAudit'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'flag', label: 'Flags' },
  { value: 'segment', label: 'Segments' },
  { value: 'sdk_key', label: 'SDK keys' },
  { value: 'webhook', label: 'Webhooks' },
  { value: 'role', label: 'Roles' },
]

/**
 * Container. The organization's change history (audit log): every flag change,
 * approval, key rotation, webhook edit, and role grant, newest first.
 */
export function AuditPage() {
  const { organizationSlug = '' } = useParams()
  const [resourceType, setResourceType] = useState('')
  const audit = useAudit(organizationSlug, resourceType)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Every change in this organization, most recent first.
        </p>
      </header>

      <Tabs value={resourceType} onValueChange={setResourceType}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {audit.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : audit.isError ? (
        <ErrorState message={audit.error.message} onRetry={() => void audit.refetch()} />
      ) : (
        <AuditList entries={audit.data} />
      )}
    </section>
  )
}
