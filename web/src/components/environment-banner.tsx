import { cn } from '@/lib/utils'

export interface EnvironmentBannerProps {
  /** Which deployment this is. Production renders nothing. */
  environment: 'development' | 'staging' | 'production'
  /** Whether the app is serving MSW fixtures instead of a real backend. */
  mocking?: boolean
  className?: string
}

const TONE = {
  development: 'bg-secondary text-secondary-foreground',
  staging: 'bg-destructive/15 text-destructive',
} as const

/**
 * A standing reminder of which deployment you are looking at.
 *
 * Renders nothing in production — the whole point is that you notice when you
 * are NOT in production, so nobody demos staging to a customer or files a bug
 * against fixture data. In development it also says whether data is mocked
 * (MSW fixtures) or coming from a real backend, so the two are never confused.
 *
 * Presentational: it takes the environment as a prop and has no idea that a
 * `config.json` exists. `AppLayout` reads the config and passes it down.
 */
export function EnvironmentBanner({ environment, mocking, className }: EnvironmentBannerProps) {
  if (environment === 'production') return null

  const text =
    environment === 'staging'
      ? 'Staging — not production data'
      : mocking
        ? 'Development — data is mocked'
        : 'Development — live API'

  return (
    <div
      role="status"
      className={cn('px-4 py-1.5 text-center text-xs font-medium', TONE[environment], className)}
    >
      {text}
    </div>
  )
}
