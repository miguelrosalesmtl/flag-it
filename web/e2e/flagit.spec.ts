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

test('filters the flag list with the search box', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()

  await expect(page.getByRole('button', { name: 'New checkout' })).toBeVisible()
  await page.getByPlaceholder('Search flags by name, key, or description').fill('pricing')
  await expect(page.getByRole('button', { name: 'Pricing tier' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New checkout' })).toBeHidden()
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

test('adds a targeting rule with a clause to a segment', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('link', { name: 'Segments' }).click()
  await page.getByRole('button', { name: 'Beta users' }).click()

  await page.getByRole('button', { name: 'Add rule' }).click()
  await page.getByLabel('Attribute').fill('country')
  await page.getByLabel('Values').fill('US, CA')
  await page.getByRole('button', { name: 'Save changes' }).click()

  // Re-seeded from the saved segment: the clause persists.
  await expect(page.getByLabel('Attribute')).toHaveValue('country')
  await expect(page.getByLabel('Values')).toHaveValue('US, CA')
})

test('creates a segment and adds an included target', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('link', { name: 'Segments' }).click()
  await expect(page.getByRole('heading', { name: 'Segments' })).toBeVisible()

  await page.getByRole('button', { name: 'New segment' }).click()
  await page.getByLabel('Name').fill('VIP users')
  await expect(page.getByLabel('Key')).toHaveValue('vip-users')
  await page.getByRole('button', { name: 'Create segment' }).click()

  // Segment detail: add an individually-included context key and save.
  await expect(page.getByRole('heading', { name: 'VIP users' })).toBeVisible()
  const included = page.getByPlaceholder('Add a context key to always include')
  await included.fill('user-42')
  await included.press('Enter')
  await expect(page.getByText('user-42')).toBeVisible()
  await page.getByRole('button', { name: 'Save changes' }).click()
  // Re-seeded from the saved segment: the target persists.
  await expect(page.getByText('user-42')).toBeVisible()
})

test('inspects a context and its expected variations', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('link', { name: 'Contexts' }).click()
  await expect(page.getByRole('heading', { name: 'Contexts' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'alice' })).toBeVisible()

  await page.getByRole('button', { name: 'alice' }).click()
  // Context detail: attributes + how every flag evaluates for it.
  await expect(page.getByRole('heading', { name: 'alice' })).toBeVisible()
  await expect(page.getByText('Expected variations')).toBeVisible()
  await expect(page.getByText('new-checkout')).toBeVisible()
})

test('opens Settings via the gear and creates an SDK key', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()

  await page.getByRole('link', { name: 'Settings' }).click()
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible()

  await page.getByRole('link', { name: 'SDK keys' }).click()
  await expect(page.getByRole('heading', { name: 'SDK keys' })).toBeVisible()
  await expect(page.getByText('CI')).toBeVisible() // seeded key

  await page.getByRole('button', { name: 'New SDK key' }).click()
  await page.getByLabel('Name').fill('mobile')
  await page.getByRole('button', { name: 'Create key' }).click()
  await expect(page.getByText('mobile')).toBeVisible()
})

test('shows roles and members in settings and adds a member', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()

  await page.getByRole('link', { name: 'Roles' }).click()
  await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible()
  await expect(page.getByText('Tenant Admin')).toBeVisible()

  await page.getByRole('link', { name: 'Members' }).click()
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
  await expect(page.getByText('admin@flag-it.dev')).toBeVisible()

  await page.getByRole('button', { name: 'Add member' }).click()
  await page.getByLabel('Email').fill('dev@flag-it.dev')
  await page.getByRole('dialog').getByRole('button', { name: 'Add member' }).click()
  await expect(page.getByText('dev@flag-it.dev')).toBeVisible()
})

test('creates a custom role with picked permissions', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('link', { name: 'Roles' }).click()

  await page.getByRole('button', { name: 'New role' }).click()
  await page.getByLabel('Name').fill('QA')
  await expect(page.getByLabel('Key')).toHaveValue('qa')
  // Pick a permission (Create role is disabled until at least one is chosen).
  await page.getByRole('checkbox').first().click()
  await page.getByRole('button', { name: 'Create role' }).click()

  await expect(page.getByRole('cell', { name: 'QA', exact: true })).toBeVisible()
})

test('signs out from the project sidebar avatar', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()

  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByText('Sign in to flag-it')).toBeVisible()
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

test('edits a flag targeting: default rule and an individual target', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  // Default rule: change what's served when off.
  await page.getByLabel('When off, serve').selectOption({ index: 0 })

  // Individual target: serve a variation to a specific context key.
  await page.getByPlaceholder('Context key').fill('user-42')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('user-42')).toBeVisible()
})

test('adds a targeting rule to a flag', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  // Build a rule: if user.country is one of [US], serve a variation.
  await page.getByLabel('Attribute').fill('country')
  await page.getByLabel('Values').fill('US')
  await page.getByRole('button', { name: 'Add rule' }).click()

  await expect(page.getByText('user.country is one of [US]')).toBeVisible()
})

test('adds a percentage-rollout rule and reorders the rules', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  const rulesSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Targeting rules' }) })

  // Rule 1: country in [US] → a variation.
  await page.getByLabel('Attribute').fill('country')
  await page.getByLabel('Values').fill('US')
  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByText('user.country is one of [US]')).toBeVisible()

  // Rule 2: plan in [pro] → a 50/50 percentage rollout.
  await page.getByLabel('Attribute').fill('plan')
  await page.getByLabel('Values').fill('pro')
  await page.getByRole('tab', { name: 'A rollout' }).click()
  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByText('user.plan is one of [pro]')).toBeVisible()
  await expect(page.getByText(/50% true/)).toBeVisible()

  // Order is [country, plan]; move the plan rule up to the top.
  const items = rulesSection.getByRole('listitem')
  await expect(items.first()).toContainText('country')
  await items.nth(1).getByRole('button', { name: 'Move rule up' }).click()
  await expect(items.first()).toContainText('plan')
})

test('edits a targeting rule in place', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  // Add a rule, then edit its clause value in place.
  await page.getByLabel('Attribute').fill('country')
  await page.getByLabel('Values').fill('US')
  await page.getByRole('button', { name: 'Add rule' }).click()
  await expect(page.getByText('user.country is one of [US]')).toBeVisible()

  await page.getByRole('button', { name: 'Edit' }).click()
  const editForm = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Save' }) })
  await editForm.getByLabel('Values').fill('CA')
  await editForm.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('user.country is one of [CA]')).toBeVisible()
  await expect(page.getByText('user.country is one of [US]')).toBeHidden()
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

test('proposes a flag change and approves it through the approvals screen', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()

  // Open a flag and request a change instead of toggling directly.
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  await page.getByRole('button', { name: 'Request change' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Comment').fill('Launch for GA')
  await dialog.getByRole('button', { name: 'Submit request' }).click()
  await expect(dialog).toBeHidden()

  // The request shows up as pending on the Approvals screen.
  await page.getByRole('link', { name: 'Approvals' }).click()
  await expect(page.getByRole('heading', { name: 'Approvals' })).toBeVisible()
  await expect(page.getByText('Launch for GA')).toBeVisible()
  await expect(page.getByText('Turn targeting on')).toBeVisible()

  // Approve it; it moves out of Pending and into Approved.
  await page.getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Launch for GA')).toBeHidden()

  await page.getByRole('tab', { name: 'Approved' }).click()
  await expect(page.getByText('Launch for GA')).toBeVisible()
})

test('schedules a flag change and then cancels it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  // No scheduled changes yet.
  await expect(page.getByText('No scheduled changes.')).toBeVisible()

  // Schedule a change (the dialog seeds a future time by default).
  await page.getByRole('button', { name: 'Schedule change' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Comment').fill('Ramp for launch')
  await dialog.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(dialog).toBeHidden()

  // It appears in the card as pending; cancel it.
  await expect(page.getByText('Ramp for launch')).toBeVisible()
  await expect(page.getByText('pending')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByText('cancelled')).toBeVisible()
})

test('shows flag lifecycle and flags stale flags', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await expect(page.getByRole('heading', { name: 'Flags' })).toBeVisible()

  await page.getByRole('link', { name: 'Lifecycle' }).click()
  await expect(page.getByRole('heading', { name: 'Flag lifecycle' })).toBeVisible()

  // Both flags listed with statuses; pricing-tier is stale, new-checkout active.
  await expect(page.getByRole('cell', { name: 'New checkout' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Active' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Stale' })).toBeVisible()

  // The Stale filter narrows to the inactive flag only.
  await page.getByRole('tab', { name: 'Stale' }).click()
  await expect(page.getByRole('cell', { name: 'Pricing tier' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'New checkout' })).toBeHidden()
})

test('creates a flag trigger, reveals its URL, then deletes it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('button', { name: 'New checkout' }).click()
  await expect(page.getByRole('heading', { name: 'New checkout' })).toBeVisible()

  // No triggers yet.
  await expect(page.getByText('No triggers.')).toBeVisible()

  // Create a trigger; its webhook URL is revealed once.
  await page.getByRole('button', { name: 'Create trigger' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Description').fill('PagerDuty incident')
  await dialog.getByRole('button', { name: 'Create trigger' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByText(/won.t be shown again/)).toBeVisible()
  await expect(page.getByText(/\/api\/v1\/triggers\/trg_/)).toBeVisible()
  await expect(page.getByText('PagerDuty incident')).toBeVisible()

  // Delete it; the empty state returns.
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No triggers.')).toBeVisible()
})

test('adds an outbound webhook in settings and reveals its secret', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill('admin@flag-it.dev')
  await page.getByLabel('Password').fill('supersecret123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Acme Inc' }).click()
  await page.getByRole('button', { name: 'Checkout' }).click()
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByRole('link', { name: 'Integrations' }).click()
  await expect(page.getByRole('heading', { name: 'Webhooks' })).toBeVisible()
  await expect(page.getByText('No webhooks yet.')).toBeVisible()

  // Add a webhook (defaults to all events); its secret is revealed once.
  await page.getByRole('button', { name: 'Add webhook' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Payload URL').fill('https://example.com/hooks/flag-it')
  await dialog.getByLabel('Description').fill('Slack notifications')
  await dialog.getByRole('button', { name: 'Add webhook' }).click()
  await expect(dialog).toBeHidden()

  await expect(page.getByText(/won.t be shown again/)).toBeVisible()
  await expect(page.getByText(/whsec_/)).toBeVisible()
  await expect(page.getByText('https://example.com/hooks/flag-it')).toBeVisible()
  await expect(page.getByText('All events')).toBeVisible()

  // A test event can be queued.
  await page.getByRole('button', { name: 'Test' }).click()
  await expect(page.getByText(/Test event queued/)).toBeVisible()

  // Delete it; the empty state returns.
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No webhooks yet.')).toBeVisible()
})
