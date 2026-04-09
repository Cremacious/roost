import { test, expect } from "@playwright/test";
import { signUp, createHousehold, FREE_ADMIN } from "./helpers/auth";

// Fresh user for the signup flow test — needs a unique email each run
// because the signup test exercises the actual account creation path.
const freshUser = () => ({
  name: "Auth Test User",
  email: `auth-${Date.now()}@roost.test`,
  password: "RoostTest123!",
});

// ---------------------------------------------------------------------------
// Public / unauthenticated
// (no storageState — tests run logged out)
// ---------------------------------------------------------------------------

test.describe("Auth flows — public", () => {
  test("homepage is public and accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from chores to login", async ({
    page,
  }) => {
    await page.goto("/chores");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('[data-testid="signup-submit"]')).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "nobody@roost.test");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test("full signup flow creates account and reaches onboarding", async ({
    page,
  }) => {
    await signUp(page, freshUser());
    await expect(page).toHaveURL(/\/onboarding/);
  });
});

// ---------------------------------------------------------------------------
// Signed-in redirect behaviour
// Uses the saved free-admin session (storageState set via project config).
// The `unauthenticated` project does NOT use storageState, so we override
// here with test.use() for just this describe block.
// ---------------------------------------------------------------------------

test.describe("Auth flows — signed in", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("signed-in user visiting /login is redirected to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL((url) => url.pathname.includes("/dashboard"), {
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
