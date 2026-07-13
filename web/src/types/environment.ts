/** An environment within a project (e.g. production, staging). */
export interface Environment {
  id: string
  project_id: string
  key: string
  name: string
  created_at: string
  updated_at: string
}

/** Payload to create an environment. */
export interface CreateEnvironmentInput {
  key: string
  name: string
}
