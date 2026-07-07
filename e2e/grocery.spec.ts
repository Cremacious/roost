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

    await page.goto("/lists");
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill(itemName);
    await quickAddInput.press("Enter");
    await expect(page.getByText(itemName, { exact: true })).toBeVisible();
  });

  test("can check off an item", async ({ page }) => {
    const itemName = `Eggs ${Date.now()}`;

    await page.goto("/lists");
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill(itemName);
    // Wait for the create POST so the optimistic temp id is replaced by the real
    // one before we toggle it (otherwise the check PATCH targets a stale id).
    const addResp = page.waitForResponse(
      (r) => /\/api\/grocery\/lists\/.+\/items/.test(r.url()) && r.request().method() === "POST"
    );
    await quickAddInput.press("Enter");
    await addResp;
    await page.waitForLoadState("networkidle").catch(() => {});

    const itemLabel = page.getByRole("button", { name: new RegExp(`^${itemName} `) });
    await expect(itemLabel).toBeVisible();

    // Toggle checked and wait for the PATCH to persist.
    const checkResp = page.waitForResponse(
      (r) => /\/api\/grocery\/items\//.test(r.url()) && r.request().method() === "PATCH"
    );
    await itemLabel.locator("xpath=..").getByRole("button", { name: "Check item" }).click();
    await checkResp;

    // v2 moves checked items into a cart section that is collapsed by default
    // (items unmounted), so a checked item leaves the visible unchecked list.
    await expect(
      page.getByRole("button", { name: new RegExp(`^${itemName} `) })
    ).toHaveCount(0, { timeout: 10000 });
  });
});
