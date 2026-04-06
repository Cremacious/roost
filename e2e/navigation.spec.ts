import { test, expect } from "@playwright/test";
import { signUp, createHousehold } from "./helpers/auth";

const uniqueUser = () => ({
  name: "Nav User",
  email: `nav-${Date.now()}@example.com`,
  password: "NavPass123!",
});

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
  test.beforeEach(async ({ page }) => {
    await signUp(page, uniqueUser());
    await createHousehold(page);
  });

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
