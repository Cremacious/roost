import { test, expect } from "@playwright/test";
import { disablePremium } from "./helpers/premium";

// storageState is set by the 'free' project in playwright.config.ts.
// No account creation needed — the seeded free-admin session is reused.
//
// Note: "shows empty state" will only pass on the first run against a clean DB.
// Subsequent runs may have chores from prior runs. The "can add a chore" test
// is reliable across runs because it checks for a specific named chore.

test.describe("Chores", () => {
  // Deterministic free-tier gate checks. The chore-count limit gate depends on
  // how many chores the seed/prior runs left in the free house, so instead we
  // exercise two gates that always fire for a free user: the locked Leaderboard
  // button (opens the chores gate sheet) and the premium-only History page.
  test("free tier: locked Leaderboard opens the chores upgrade gate", async ({
    page,
  }) => {
    await disablePremium(page);
    await page.goto("/chores");
    // The locked Leaderboard button carries aria-disabled=true (premium lock UI),
    // so Playwright treats it as disabled. force the click; the React onClick that
    // opens the gate still fires.
    await page
      .getByRole("button", { name: /Leaderboard/ })
      .click({ force: true });

    const premiumGate = page.getByRole("dialog");
    await expect(
      premiumGate.getByRole("button", { name: "Upgrade for $4/month" })
    ).toBeVisible();
    await expect(premiumGate).toContainText("Unlock recurring chores");
  });

  test("free tier: chore history is premium gated", async ({ page }) => {
    await disablePremium(page);
    await page.goto("/chores");
    await page.getByRole("button", { name: /History/ }).click();
    await expect(page).toHaveURL(/\/chores\/history/);
    await expect(
      page.getByRole("button", { name: "Upgrade for $4/month" })
    ).toBeVisible();
    await expect(page.locator("body")).toContainText("Unlock recurring chores");
  });
});
