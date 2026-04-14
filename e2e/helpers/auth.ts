import { expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Fixed seed account credentials
// These match src/db/seed.ts exactly.
// ---------------------------------------------------------------------------

export const FREE_ADMIN = {
  email: "admin.free@roost.test",
  password: "RoostTest123!",
  name: "Free Admin",
};

export const PREMIUM_ADMIN = {
  email: "admin.premium@roost.test",
  password: "RoostTest123!",
  name: "Premium Admin",
};

export const TEST_MEMBER = {
  email: "member@roost.test",
  password: "RoostTest123!",
  name: "Test Member",
};

export const TEST_CHILD = {
  name: "Test Child",
  pin: "1234",
};

export const HOUSEHOLD_NAME = "Roost Free House";
export const FREE_HOUSEHOLD_CODE = "RSTFRE";
export const PREMIUM_HOUSEHOLD_CODE = "RSTPRM";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissWelcomeDialog(page: Page) {
  const gotItButton = page.getByRole("button", { name: "Got it, let's go" });

  if (await gotItButton.isVisible().catch(() => false)) {
    await gotItButton.click({ force: true });
    await expect(gotItButton).not.toBeVisible({ timeout: 5000 });
  }
}

/**
 * Signs up a brand-new account (used only for tests that exercise the signup
 * flow itself — e.g. onboarding.spec.ts). Uses pressSequentially for the name
 * field to trigger React onChange on mobile WebKit.
 */
export async function signUp(
  page: Page,
  user: { name: string; email: string; password: string }
) {
  await page.goto("/signup");
  await page.waitForLoadState("domcontentloaded");
  const nameInput = page.locator('input[placeholder="What should we call you?"]');
  await nameInput.click();
  await nameInput.pressSequentially(user.name, { delay: 30 });
  await page.fill('input[type="email"]', user.email);
  const passwordInputs = await page.locator('input[type="password"]').all();
  await passwordInputs[0].fill(user.password);
  await passwordInputs[1].fill(user.password);
  await page.click('[data-testid="signup-submit"]');
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  // Accept either /onboarding (new account) or /dashboard (account with household)
  await page.waitForURL(
    (url) =>
      url.pathname.includes("/onboarding") || url.pathname.includes("/dashboard"),
    { timeout: 45000 }
  );
}

/**
 * Signs in an existing account via the login form.
 */
export async function signIn(
  page: Page,
  user: { email: string; password: string } = FREE_ADMIN
) {
  await page.goto("/login");
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.click();
  await emailInput.fill("");
  await emailInput.pressSequentially(user.email, { delay: 20 });
  await passwordInput.click();
  await passwordInput.fill("");
  await passwordInput.pressSequentially(user.password, { delay: 20 });
  await page.getByRole("button", { name: /^Sign in$/ }).click();
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForURL("**/dashboard", { timeout: 30000 });
}

/**
 * Completes the onboarding flow by creating a household.
 * Only needed after a fresh signUp() that lands on /onboarding.
 */
export async function createHousehold(page: Page, name = HOUSEHOLD_NAME) {
  if (page.url().includes("/dashboard")) return;

  await page.waitForURL("**/onboarding", { timeout: 10000 });

  await page.click("text=Create a household");
  const householdInput = page.locator('input[placeholder*="Johnson" i]').first();
  await householdInput.fill(name);
  await page.click("text=Create household");
  await page.click("text=Go to dashboard");
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await page.waitForURL("**/login", { timeout: 15000 });
}
