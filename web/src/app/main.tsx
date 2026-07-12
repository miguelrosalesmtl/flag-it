import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { loadConfig } from '@/config/env'
import '@/index.css'

/**
 * Boot order matters:
 *
 *   1. Load and validate /config.json — the app cannot function without it.
 *   2. Start MSW if this deployment is configured to run on fixtures.
 *   3. Render.
 *
 * Config is fetched before the mock worker starts, so /config.json is always a
 * real request for a real static file, never an intercepted one.
 */
async function bootstrap() {
  const config = await loadConfig()

  if (import.meta.env.DEV && config.enableMocking) {
    const { startWorker } = await import('@/mocks/browser')
    await startWorker()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap().catch((error: unknown) => {
  // A config failure is fatal, and it must be loud. Never a blank white page.
  console.error(error)
  const message = error instanceof Error ? error.message : String(error)
  const root = document.getElementById('root')
  if (root) {
    root.textContent = `Failed to start.\n\n${message}`
    root.setAttribute(
      'style',
      'padding:2rem;font-family:ui-monospace,monospace;color:#f87171;white-space:pre-wrap',
    )
  }
})
