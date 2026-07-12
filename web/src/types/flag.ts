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
