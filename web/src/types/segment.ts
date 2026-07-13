/**
 * A segment: a reusable, named group of contexts (by key or by rule) that flag
 * targeting rules can reference. Definition-level; membership evaluation is
 * server-side.
 */
export interface Segment {
  id: string
  project_id: string
  key: string
  name: string
  description: string
  included: string[]
  excluded: string[]
  rules: unknown[]
  version: number
  created_at: string
  updated_at: string
}
