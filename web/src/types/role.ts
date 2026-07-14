/** Payload to create a custom role. */
export interface CreateRoleInput {
  key: string
  name: string
  description?: string
  scope: 'organization' | 'project'
  permissions: string[]
}

/** A role: a named permission bundle, scoped to a organization or its projects. */
export interface Role {
  id: string
  organization_id: string
  key: string
  name: string
  description: string
  scope: 'organization' | 'project'
  is_system: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}
