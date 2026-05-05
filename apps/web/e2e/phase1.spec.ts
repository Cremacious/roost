import { test, expect, Page } from '@playwright/test'

// Unique email per test run so repeated runs don't collide.
const ts = Date.now()
const testEmail = `phase1.smoke+${ts}@example.com`
const testPassword = 'SmokeTest123!'
const testName = `Smoke User ${ts}`
const testHousehold = `Smoke House ${ts}`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('[placeholder="you@example.com"]', email)
  await page.fill('[placeholder="••••••••"]', password)
  await page.click('button:has-text("Sign in")')
  await page.waitForURL(/\/today/, { timeout: 20_000 })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.serial('Phase 1 smoke tests', () => {
  test('onboarding: create account, create household, land on Today', async ({ page }) => {
    // Step 1: Account creation
    await page.goto('/onboarding')
    await page.fill('[placeholder="Your name"]', testName)
    await page.fill('[placeholder="you@example.com"]', testEmail)
    await page.fill('[placeholder="••••••••"]', testPassword)
    await page.click('button:has-text("Continue")')

    // Step 2: Choose path
    await expect(page.locator('text=Your household')).toBeVisible({ timeout: 10_000 })
    await page.click('text=Create a household')

    // Step 3a: Name the household
    await expect(page.locator('text=Name your household')).toBeVisible({ timeout: 10_000 })
    await page.fill('[placeholder="e.g. The Johnson House"]', testHousehold)
    await page.click('button:has-text("Create household")')

    // Step 4: Success screen
    await expect(page.locator(`text=${testHousehold}`)).toBeVisible({ timeout: 15_000 })
    await page.click('button:has-text("Go to Today")')

    // Should land on the Today dashboard
    await page.waitForURL(/\/today/, { timeout: 20_000 })
    await expect(page).toHaveURL(/\/today/)
  })

  test('navigation: all 5 tabs are reachable and render correctly', async ({ page }) => {
    await signIn(page, testEmail, testPassword)

    // Verify Today is the landing tab
    await expect(page).toHaveURL(/\/today/)

    // Stub tabs: each should show its name and the placeholder message
    const stubs: Array<[string, string]> = [
      ['/household', 'Household'],
      ['/food', 'Food'],
      ['/money', 'Money'],
      ['/more', 'More'],
    ]

    for (const [href, label] of stubs) {
      await page.goto(href)
      await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('text=Coming in the next update')).toBeVisible({ timeout: 10_000 })
    }

    // Navigate back to Today via the nav
    await page.goto('/today')
    await expect(page).toHaveURL(/\/today/)
  })
})
