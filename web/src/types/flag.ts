import type { Clause } from '@/types/segment'

/**
 * A flag *definition*. Per-environment state (on/off, targeting rules) is a
 * separate resource (FlagConfig) and is not part of this shape — the list screen
 * shows the definition; the on/off toggle belongs to a per-environment view.
 *
 * `variations` are opaque JSON values (boolean, string, number, or object), so
 * they are typed as `unknown[]`.
 */
export interface Flag {
  id: string
  project_id: string
  key: string
  name: string
  description: string
  client_side_available: boolean
  variations: unknown[]
  created_at: string
  updated_at: string
}

/** A flag definition plus its on/off state in a specific environment. */
export interface FlagWithState extends Flag {
  on: boolean
}

/** Payload to create/update a flag definition. Variations are opaque JSON values. */
export interface CreateFlagInput {
  key: string
  name: string
  description?: string
  client_side_available?: boolean
  variations: unknown[]
}

/** A variation index or a percentage rollout — how a rule/fallthrough serves a value. */
export interface VariationOrRollout {
  variation?: number
  rollout?: {
    variations: { variation: number; weight: number }[]
    bucketBy?: string
  }
}

/** A targeting rule: contexts matching all clauses get the served variation. */
export interface FlagRule {
  id?: string
  clauses: Clause[]
  variation?: number
  rollout?: VariationOrRollout['rollout']
}

/**
 * A flag's configuration in one environment: the on/off switch, targeting, and
 * the fallthrough. Written via the semantic-instruction PATCH; read via GET.
 */
/** An individual target: serve a variation to specific context keys. */
export interface Target {
  contextKind: string
  values: string[]
  variation: number
}

export interface FlagConfig {
  on: boolean
  off_variation: number
  fallthrough: VariationOrRollout
  targets: Target[]
  rules: FlagRule[]
  version: number
}

/** A semantic instruction applied to a flag's env config (surgical edit). */
export interface FlagInstruction {
  kind: string
  variation?: number
  contextKind?: string
  values?: string[]
  clauses?: Clause[]
  ruleId?: string
}
