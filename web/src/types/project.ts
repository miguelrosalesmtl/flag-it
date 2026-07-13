/** A project: an application within a tenant, holding flags across environments. */
export interface Project {
  id: string
  tenant_id: string
  key: string
  name: string
  created_at: string
  updated_at: string
}

/** Payload to create a project. */
export interface CreateProjectInput {
  key: string
  name: string
}
