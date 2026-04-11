import { Page } from "@playwright/test";

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
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('[data-testid="login-submit"]');
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
  const signOutBtn = page.locator('[data-testid="sign-out-btn"]');
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click();
    await page.click("text=Sign out", { timeout: 3000 });
  } else {
    await page.click("text=More");
    await page.click("text=Sign out");
    await page.click("text=Sign out", { timeout: 3000 });
  }
  await page.waitForURL("/login");
}
