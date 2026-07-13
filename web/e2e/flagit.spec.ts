import { expect, test } from '@playwright/test'

/**
 * These run against the real dev server, which boots the way production does:
 * fetch /config.json, validate it, then render. The Playwright webServer forces
 * `APP_ENABLE_MOCKING=true`, so the API is served by MSW — no backend needed.
 *
 *   pnpm test:e2e           headless
 *   pnpm test:e2e:ui        interactive time-travel debugger
 *   pnpm test:e2e:headed    watch a real browser do it
 */

test('a fresh install runs the first-run setup wizard and lands in the app', async ({ page }) => {
  await page.goto('/?scenario=needs-setup')

  // The boot gate saw needs_setup and opened the wizard.
  await expect(page.getByText('Welcome to flag-it', { exact: false })).toBeVisible()

  // Step 1: the owner account.
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 2: the first tenant. The slug auto-derives from the name.
  await page.getByLabel('Tenant name').fill('Acme Inc')
  await expect(page.getByLabel('Tenant slug')).toHaveValue('acme-inc')
  await page.getByRole('button', { name: 'Finish setup' }).click()

  // Setup signs the new superuser in and drops them on the first screen.
  await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible()
})

test('a configured install shows login, signs in, and lists tenants', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Sign in to flag-it')).toBeVisible()
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible()
  await expect(page.getByText('Acme Inc')).toBeVisible()

  // Signing out returns to the login screen.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByText('Sign in to flag-it')).toBeVisible()
})

test('drills from a tenant into its projects and a project into its flags', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Tenant -> Projects
  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeVisible()

  // Project -> Flags
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByText('New checkout')).toBeVisible()
  await expect(page.getByText('pricing-tier')).toBeVisible()
})

test('opens a flag and toggles it on for an environment', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()

  // Flag detail: default off, flip it on. The switch reflects the PATCH result.
  const toggle = page.getByRole('switch', { name: 'Toggle flag' })
  await expect(toggle).toHaveAttribute('data-state', 'unchecked')
  await toggle.click()
  await expect(toggle).toHaveAttribute('data-state', 'checked')
})

test('bad credentials show an error and keep you on the login screen', async ({ page }) => {
  await page.goto('/?scenario=login-error')

  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password.')
  await expect(page.getByText('Sign in to flag-it')).toBeVisible()
})
