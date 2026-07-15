/** Per-variation evaluation counts for one flag in an environment. */
export interface FlagStats {
  flag_key: string
  environment: string
  since: string
  variations: { variation: number; count: number }[]
  total: number
}

/** Per-flag evaluation totals for an environment, most-active first. */
export interface EnvStats {
  environment: string
  since: string
  flags: { flag_key: string; count: number }[]
  total: number
}

/** Lookback windows offered in the UI (value is a Go duration for the API). */
export const STATS_WINDOWS = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '168h', label: '7d' },
  { value: '720h', label: '30d' },
] as const
