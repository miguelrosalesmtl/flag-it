import { expect, test } from '@playwright/test'

/**
 * These run against the real dev server, which boots the way production does:
 * fetch /config.json, validate it, then render. Because config.json sets
 * `enableMocking: true`, the API is served by MSW — so E2E needs no backend.
 *
 *   pnpm test:e2e           headless
 *   pnpm test:e2e:ui        interactive time-travel debugger
 *   pnpm test:e2e:headed    watch a real browser do it
 *   pnpm test:e2e:report    open the last HTML report
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('boots from runtime config and lists users', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByText('Alan Turing')).toBeVisible()
  await expect(page.getByText('Grace Hopper')).toBeVisible()
})

test('config.json is served and drives the app', async ({ page }) => {
  const response = await page.request.get('/config.json')
  expect(response.ok()).toBeTruthy()

  // No environment value is compiled into the bundle; it all comes from here.
  expect(await response.json()).toMatchObject({
    apiUrl: '/api',
    environment: 'development',
    enableMocking: true,
  })
})

test('deleting a user removes it from the list', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Ada Lovelace' }).click()

  await expect(page.getByText('Ada Lovelace')).toBeHidden()
  await expect(page.getByText('Alan Turing')).toBeVisible()
})

test('deleting every user falls through to the empty state', async ({ page }) => {
  for (const name of ['Ada Lovelace', 'Alan Turing', 'Grace Hopper']) {
    await page.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(page.getByText(name)).toBeHidden()
  }

  await expect(page.getByText('No users yet.')).toBeVisible()
})

test('a failing API surfaces the error state, and retry recovers', async ({ page }) => {
  // MSW's service worker sits *beneath* page.route, so Playwright cannot fulfil
  // these requests itself. Steer the mock API instead: see src/mocks/scenarios.ts.
  await page.goto('/?scenario=users-error')

  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  await expect(alert).toContainText('Something went wrong')

  // Drop the failing handler, then let the user retry for real.
  await page.evaluate(() => window.msw?.worker.resetHandlers())
  await page.getByRole('button', { name: 'Try again' }).click()

  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(alert).toBeHidden()
})

test('the empty-state scenario renders the empty state', async ({ page }) => {
  await page.goto('/?scenario=users-empty')

  await expect(page.getByText('No users yet.')).toBeVisible()
})
