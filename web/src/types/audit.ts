/** One immutable record of a change, from the organization's audit log. */
export interface AuditEntry {
  id: string
  organization_id?: string
  project_id?: string
  actor_id?: string
  actor_email: string
  action: string // e.g. flag.config.patched
  resource_type: string // e.g. flag, segment, sdk_key, role, webhook, trigger
  resource_key: string
  comment?: string
  data?: unknown
  created_at: string
}
