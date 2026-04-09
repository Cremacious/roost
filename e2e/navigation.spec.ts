import { test, expect } from "@playwright/test";

// storageState is set by the 'free' project in playwright.config.ts.
// No account creation needed — the seeded free-admin session is reused.

const APP_ROUTES = [
  "/dashboard",
  "/chores",
  "/grocery",
  "/calendar",
  "/tasks",
  "/notes",
  "/meals",
  "/reminders",
  "/expenses",
];

test.describe("Navigation", () => {
  for (const route of APP_ROUTES) {
    test(`${route} loads without errors`, async ({ page }) => {
      await page.goto(route);
      // Should not be redirected to login or error page
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).toHaveURL(route);
      // No unhandled error overlay
      await expect(page.locator("text=Application error")).not.toBeVisible();
      await expect(page.locator("text=500")).not.toBeVisible();
    });
  }
});
