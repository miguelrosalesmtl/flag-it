/** A context seen during evaluation, in one environment. */
export interface SeenContext {
  id: string
  environment_id: string
  kind: string
  key: string
  attributes: Record<string, unknown>
  first_seen: string
  last_seen: string
}

/** How one flag evaluates for a context (the "expected variations" view). */
export interface ContextEvaluation {
  flag_key: string
  variation: number
  value: unknown
  reason: string
}

/** A context's attributes plus how every flag evaluates for it. */
export interface ContextDetail {
  context: SeenContext
  evaluations: ContextEvaluation[]
}
