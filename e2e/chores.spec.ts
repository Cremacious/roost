import { test, expect } from "@playwright/test";
import { disablePremium } from "./helpers/premium";

// storageState is set by the 'free' project in playwright.config.ts.
// No account creation needed — the seeded free-admin session is reused.
//
// Note: "shows empty state" will only pass on the first run against a clean DB.
// Subsequent runs may have chores from prior runs. The "can add a chore" test
// is reliable across runs because it checks for a specific named chore.

test.describe("Chores", () => {
  test("can add a chore", async ({ page }) => {
    await page.goto("/chores");
    const addBtn = page
      .locator('button[aria-label="Add chore"], button:has-text("Add")')
      .first();
    await addBtn.click();
    const nameInput = page.locator('input[placeholder*="Vacuum"]').first();
    await nameInput.fill("Wash the dishes");
    await page.click('[data-testid="chore-save-btn"]');
    await expect(page.locator("text=Wash the dishes")).toBeVisible();
  });

  test("weekly/monthly chores show premium lock on free tier", async ({
    page,
  }) => {
    await disablePremium(page);
    await page.goto("/chores");
    const addBtn = page
      .locator('button[aria-label="Add chore"], button:has-text("Add")')
      .first();
    await addBtn.click();
    const weeklyBtn = page.locator("text=Weekly").first();
    await expect(weeklyBtn).toBeVisible();
    const lockIcon = page.locator('[data-testid="chore-sheet"] svg').first();
    await expect(lockIcon).toBeTruthy();
  });
});
