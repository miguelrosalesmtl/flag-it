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

test('creates a project from the projects screen', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()

  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Name').fill('Analytics')
  await expect(page.getByLabel('Key')).toHaveValue('analytics')
  await page.getByRole('button', { name: 'Create project' }).click()

  // Lands on the new project's flags page — the sidebar switcher shows its name.
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analytics' })).toBeVisible()
})

test('navigates to Segments via the project sidebar', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()

  // The sidebar Features nav.
  await page.getByRole('link', { name: 'Segments' }).click()
  await expect(page.getByRole('heading', { name: 'Segments' })).toBeVisible()
  await expect(page.getByText('Beta users')).toBeVisible()
})

test('creates a boolean flag and lands on its detail page', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()

  await page.getByRole('button', { name: 'New flag' }).click()
  await page.getByLabel('Name').fill('Dark mode')
  await expect(page.getByLabel('Key')).toHaveValue('dark-mode')
  await page.getByRole('button', { name: 'Create flag' }).click()

  // Lands on the new flag's detail page, off by default.
  await expect(page.getByRole('heading', { name: 'Dark mode' })).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Toggle flag' })).toHaveAttribute(
    'data-state',
    'unchecked',
  )
})

test('toggles a flag on from the flag list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()

  // Inline per-row switch, operating on the selected environment.
  const toggle = page.getByRole('switch', { name: 'Toggle New checkout' })
  await expect(toggle).toHaveAttribute('data-state', 'unchecked')
  await toggle.click()
  await expect(toggle).toHaveAttribute('data-state', 'checked')
})

test('creates an environment from the Environments settings', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()

  await page.getByRole('link', { name: 'Environments' }).click()
  await expect(page.getByRole('heading', { name: 'Environments' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Production', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'New environment' }).click()
  await page.getByLabel('Name').fill('QA')
  await expect(page.getByLabel('Key')).toHaveValue('qa')
  await page.getByRole('button', { name: 'Create environment' }).click()

  await expect(page.getByRole('cell', { name: 'QA', exact: true })).toBeVisible()
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
