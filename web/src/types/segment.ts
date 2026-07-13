/** A targeting clause: match an attribute against values with an operator. */
export interface Clause {
  contextKind?: string
  attribute?: string
  op: string
  values: unknown[]
  negate?: boolean
}

/** A segment rule: a context is in the segment if it matches all clauses. */
export interface SegmentRule {
  id?: string
  clauses: Clause[]
  weight?: number
  bucketBy?: string
  rolloutContextKind?: string
}

/** Non-user context targets (kind + keys). */
export interface SegmentTarget {
  contextKind: string
  values: string[]
}

/**
 * A segment: a reusable, named group of contexts (by key or by rule) that flag
 * targeting rules can reference. Project-scoped; membership is evaluated server-side.
 */
export interface Segment {
  id: string
  project_id: string
  key: string
  name: string
  description: string
  included: string[]
  excluded: string[]
  included_contexts: SegmentTarget[]
  excluded_contexts: SegmentTarget[]
  rules: SegmentRule[]
  version: number
  created_at: string
  updated_at: string
}

/** Payload to create a segment. */
export interface CreateSegmentInput {
  key: string
  name: string
  description?: string
}

/** Payload to save a segment's definition (full replace via PUT). */
export interface SaveSegmentInput {
  name: string
  description: string
  included: string[]
  excluded: string[]
  included_contexts: SegmentTarget[]
  excluded_contexts: SegmentTarget[]
  rules: SegmentRule[]
}
