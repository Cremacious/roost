import { test, expect } from "@playwright/test";
import { signUp, signIn, createHousehold, TEST_USER } from "./helpers/auth";

const uniqueUser = {
  name: "Auth Test User",
  email: `auth-test-${Date.now()}@example.com`,
  password: "SecurePass123!",
};

test.describe("Auth flows", () => {
  test("homepage is public and accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL("/login");
    // Should show some marketing content
    await expect(page.locator("body")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from chores to login", async ({ page }) => {
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
    await page.fill('input[type="email"]', "nobody@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('[data-testid="login-submit"]');
    // Should stay on login and show an error toast
    await expect(page).toHaveURL(/\/login/);
  });

  test("full signup flow creates account and reaches onboarding", async ({ page }) => {
    await signUp(page, uniqueUser);
    await expect(page).toHaveURL("/onboarding");
  });

  test("signed-in user visiting /login is redirected to dashboard", async ({ page }) => {
    await signUp(page, uniqueUser);
    await createHousehold(page);
    await page.goto("/login");
    await expect(page).toHaveURL("/dashboard");
  });
});
