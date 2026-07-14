import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { setConfig } from '@/config/env'
import { resetUsers } from '@/mocks/handlers'
import { server } from '@/mocks/server'

// jsdom lacks APIs that Radix primitives (dialogs, etc.) touch. Stub them.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}

// Tests do not boot through main.tsx, so there is no /config.json fetch.
// Inject the config the app would otherwise have loaded.
setConfig({
  apiUrl: '/api/v1',
  environment: 'development',
  enableMocking: true,
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetUsers()
})

afterAll(() => server.close())
