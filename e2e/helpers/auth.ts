import { Page } from "@playwright/test";

export const TEST_USER = {
  name: "Test User",
  email: `test-${Date.now()}@example.com`,
  password: "TestPass123!",
};

export const HOUSEHOLD_NAME = "Test Household";

export async function signUp(page: Page, user = TEST_USER) {
  await page.goto("/signup");
  await page.waitForLoadState("domcontentloaded");
  // pressSequentially fires per-character keydown/input/keyup events — the only reliable
  // way to update React controlled inputs on mobile WebKit (fill/insertText does not trigger onChange)
  const nameInput = page.locator('input[placeholder="What should we call you?"]');
  await nameInput.click();
  await nameInput.pressSequentially(user.name, { delay: 30 });
  await page.fill('input[type="email"]', user.email);
  const passwordInputs = await page.locator('input[type="password"]').all();
  await passwordInputs[0].fill(user.password);
  await passwordInputs[1].fill(user.password);
  await page.click('[data-testid="signup-submit"]');
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  // Accept either /onboarding (new account) or /dashboard (account with existing household)
  await page.waitForURL(
    (url) => url.pathname.includes("/onboarding") || url.pathname.includes("/dashboard"),
    { timeout: 45000 }
  );
}

export async function signIn(page: Page, user = TEST_USER) {
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL("/dashboard");
}

export async function createHousehold(page: Page, name = HOUSEHOLD_NAME) {
  // If signup already landed on /dashboard, the household was already created
  if (page.url().includes("/dashboard")) return;

  await page.waitForURL("**/onboarding", { timeout: 10000 });

  // Step 1: choose "Create a household"
  await page.click("text=Create a household");
  // Step 2: fill the name — placeholder is "e.g. The Johnson House"
  const householdInput = page.locator('input[placeholder*="Johnson" i]').first();
  await householdInput.fill(name);
  // Step 2 submit — advances to step 3 (confirmation screen, not /dashboard)
  await page.click("text=Create household");
  // Step 3: click "Go to dashboard" to navigate
  await page.click("text=Go to dashboard");
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForURL("**/dashboard", { timeout: 15000 });
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
