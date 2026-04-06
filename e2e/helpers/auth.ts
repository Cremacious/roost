import { Page } from "@playwright/test";

export const TEST_USER = {
  name: "Test User",
  email: `test-${Date.now()}@example.com`,
  password: "TestPass123!",
};

export const HOUSEHOLD_NAME = "Test Household";

export async function signUp(page: Page, user = TEST_USER) {
  await page.goto("/signup");
  await page.fill('input[type="text"]', user.name);
  await page.fill('input[type="email"]', user.email);
  const passwordInputs = await page.locator('input[type="password"]').all();
  await passwordInputs[0].fill(user.password);
  await passwordInputs[1].fill(user.password);
  await page.click('[data-testid="signup-submit"]');
  await page.waitForURL("/onboarding");
}

export async function signIn(page: Page, user = TEST_USER) {
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL("/dashboard");
}

export async function createHousehold(page: Page, name = HOUSEHOLD_NAME) {
  // On onboarding page, click "Create a household"
  await page.click("text=Create a household");
  const householdInput = page.locator('input[placeholder*="house"]').first();
  await householdInput.fill(name);
  await page.click("text=Create household");
  await page.waitForURL("/dashboard");
}

export async function signOut(page: Page) {
  // Desktop: click sign-out button in sidebar
  const signOutBtn = page.locator('[data-testid="sign-out-btn"]');
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click();
    // Confirm in dialog
    await page.click("text=Sign out", { timeout: 3000 });
  } else {
    // Mobile: More tab in BottomNav
    await page.click("text=More");
    await page.click("text=Sign out");
    await page.click("text=Sign out", { timeout: 3000 });
  }
  await page.waitForURL("/login");
}
