import { test, expect } from "@playwright/test";

// storageState is set by the 'free' project in playwright.config.ts.
// No account creation needed — the seeded free-admin session is reused.
//
// Note: "shows empty state" will only pass on the first run against a clean DB.
// The "can quick add" and "can check off" tests are reliable across runs
// because they check for items added within the test itself.

test.describe("Grocery", () => {
  test("can quick add an item", async ({ page }) => {
    await page.goto("/grocery");
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill("Milk");
    await quickAddInput.press("Enter");
    await expect(page.locator("text=Milk")).toBeVisible();
  });

  test("can check off an item", async ({ page }) => {
    await page.goto("/grocery");
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill("Eggs");
    await quickAddInput.press("Enter");
    await expect(page.locator("text=Eggs")).toBeVisible();
    const checkbox = page.locator('button[aria-label="Check item"]').first();
    await checkbox.click();
    await expect(page.locator("text=In the cart")).toBeVisible();
  });
});
