/** A role: a named permission bundle, scoped to a tenant or its projects. */
export interface Role {
  id: string
  tenant_id: string
  key: string
  name: string
  description: string
  scope: 'tenant' | 'project'
  is_system: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}
