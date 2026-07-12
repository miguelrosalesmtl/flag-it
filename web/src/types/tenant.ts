/** A tenant: the top of the org hierarchy (tenant → project → environment). */
export interface Tenant {
  id: string
  slug: string
  name: string
  created_at: string
  updated_at: string
}
