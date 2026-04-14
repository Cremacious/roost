import { test, expect } from "@playwright/test";

// storageState is set by the 'free' project in playwright.config.ts.
// No account creation needed — the seeded free-admin session is reused.
//
// Note: "shows empty state" will only pass on the first run against a clean DB.
// The "can quick add" and "can check off" tests are reliable across runs
// because they check for items added within the test itself.

test.describe("Grocery", () => {
  test("can quick add an item", async ({ page }) => {
    const itemName = `Milk ${Date.now()}`;

    await page.goto("/grocery");
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill(itemName);
    await quickAddInput.press("Enter");
    await expect(page.getByText(itemName, { exact: true })).toBeVisible();
  });

  test("can check off an item", async ({ page }) => {
    const itemName = `Eggs ${Date.now()}`;

    await page.goto("/grocery");
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill(itemName);
    await quickAddInput.press("Enter");
    const itemLabel = page.getByRole("button", { name: new RegExp(`^${itemName} `) });

    await expect(itemLabel).toBeVisible();
    const itemRow = itemLabel.locator('xpath=ancestor::div[contains(@class, "group flex min-h-16")][1]');
    const checkbox = itemRow.getByRole("button", { name: "Check item" });
    await checkbox.click();
    await expect(page.getByRole("button", { name: /In the cart \(\d+\)/ })).toBeVisible();
    await expect(page.getByText(itemName, { exact: true })).toBeVisible();
  });
});
