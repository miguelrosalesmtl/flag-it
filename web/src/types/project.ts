/** A project: an application within a organization, holding flags across environments. */
export interface Project {
  id: string
  organization_id: string
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
