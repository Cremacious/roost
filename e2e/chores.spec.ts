import { test, expect } from "@playwright/test";
import { disablePremium } from "./helpers/premium";

// storageState is set by the 'free' project in playwright.config.ts.
// No account creation needed — the seeded free-admin session is reused.
//
// Note: "shows empty state" will only pass on the first run against a clean DB.
// Subsequent runs may have chores from prior runs. The "can add a chore" test
// is reliable across runs because it checks for a specific named chore.

test.describe("Chores", () => {
  test("free tier shows upgrade gate when chore limit is reached", async ({
    page,
  }) => {
    const choreName = `Wash the dishes ${Date.now()}`;

    await disablePremium(page);
    await page.goto("/chores");
    const addBtn = page
      .locator('button[aria-label="Add chore"], button:has-text("Add")')
      .first();
    await addBtn.click();
    const nameInput = page.locator('input[placeholder*="Vacuum"]').first();
    await nameInput.fill(choreName);
    await page.click('[data-testid="chore-save-btn"]');

    const premiumGate = page.getByRole("dialog");
    await expect(
      premiumGate.getByRole("button", { name: "Upgrade for $4/month" })
    ).toBeVisible();
    await expect(premiumGate).toContainText("Chores that actually get done.");
    await expect(page.getByText(choreName, { exact: true })).not.toBeVisible();
  });

  test("weekly/monthly chores show premium lock on free tier", async ({
    page,
  }) => {
    await disablePremium(page);
    await page.goto("/chores");
    await page.getByRole("button", { name: /History/ }).click();
    const premiumGate = page.getByRole("dialog");
    await expect(premiumGate.getByRole("button", { name: "Upgrade for $4/month" })).toBeVisible();
    await expect(premiumGate).toContainText("Chores that actually get done.");
  });
});
