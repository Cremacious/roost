import { test, expect } from "@playwright/test";
import { FREE_ADMIN, signIn, signOut } from "./helpers/auth";

// storageState is set by the 'premium' / 'mobile-premium' projects in
// playwright.config.ts — the seeded premium-admin session is reused.
//
// The seeded premium account has subscription_status = 'premium' in the DB,
// so no DevTools toggling is needed to test premium features.
// The seeded free account (admin.free@roost.test) is used inline via
// test.use() for tests that specifically exercise the free-tier gate.

test.describe("Premium — free tier gates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    if (!page.url().includes("/login")) {
      await signOut(page);
    }
    await signIn(page, FREE_ADMIN);
  });

  test("expenses recurring tab shows upgrade prompt for free users", async ({ page }) => {
    await page.goto("/expenses");
    await page.getByRole("button", { name: /^Recurring$/ }).first().click();
    const premiumGate = page.getByRole("dialog");
    await expect(premiumGate.getByRole("button", { name: "Upgrade for $4/month" })).toBeVisible();
    await expect(premiumGate).toContainText("Unlock the full picture.");
  });

  test("dashboard tiles are visible on free tier", async ({ page }) => {
    await page.goto("/dashboard");
    const dashboardTiles = page.locator('[data-testid="dashboard-tiles"]');
    await expect(dashboardTiles).toContainText("Chores");
    await expect(dashboardTiles).toContainText("Grocery");
  });
});

test.describe("Premium — full module access", () => {
  // storageState comes from the project config (premium-admin.json)

  test("expenses page shows full module for premium users", async ({ page }) => {
    await page.goto("/expenses");
    // Premium users see the expense tracking UI, not the upgrade prompt
    await expect(page.locator("body")).toContainText("All square.");
  });
});
