import { useLocation } from 'react-router'

/**
 * Container. A stub for settings sections whose backend isn't built yet. Derives
 * its title from the route so a single component serves every placeholder.
 */
export function SettingsPlaceholder() {
  const { pathname } = useLocation()
  const slug = pathname.split('/').pop() ?? ''
  const title = slug
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <p className="text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
        This section isn’t built yet.
      </p>
    </section>
  )
}
