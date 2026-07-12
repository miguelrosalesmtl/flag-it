import { cn } from '@/lib/utils'

export interface EnvironmentBannerProps {
  /** Which deployment this is. Production renders nothing. */
  environment: 'development' | 'staging' | 'production'
  className?: string
}

const LABELS = {
  development: {
    text: 'Development — data is mocked',
    tone: 'bg-secondary text-secondary-foreground',
  },
  staging: { text: 'Staging — not production data', tone: 'bg-destructive/15 text-destructive' },
} as const

/**
 * A standing reminder of which deployment you are looking at.
 *
 * Renders nothing in production — the whole point is that you notice when you
 * are NOT in production, so nobody demos staging to a customer or files a bug
 * against fixture data.
 *
 * Presentational: it takes the environment as a prop and has no idea that a
 * `config.json` exists. `AppLayout` reads the config and passes it down.
 */
export function EnvironmentBanner({ environment, className }: EnvironmentBannerProps) {
  if (environment === 'production') return null

  const { text, tone } = LABELS[environment]

  return (
    <div
      role="status"
      className={cn('px-4 py-1.5 text-center text-xs font-medium', tone, className)}
    >
      {text}
    </div>
  )
}
