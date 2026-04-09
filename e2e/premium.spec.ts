import { test, expect } from "@playwright/test";

// storageState is set by the 'premium' / 'mobile-premium' projects in
// playwright.config.ts — the seeded premium-admin session is reused.
//
// The seeded premium account has subscription_status = 'premium' in the DB,
// so no DevTools toggling is needed to test premium features.
// The seeded free account (admin.free@roost.test) is used inline via
// test.use() for tests that specifically exercise the free-tier gate.

test.describe("Premium — free tier gates", () => {
  // Override to free-admin for this block
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("expenses page shows upgrade prompt for free users", async ({ page }) => {
    await page.goto("/expenses");
    await expect(
      page
        .locator("text=Upgrade to Premium")
        .or(page.locator("text=Upgrade for $3/month"))
        .first()
    ).toBeVisible();
  });

  test("dashboard tiles are visible on free tier", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page
        .locator('[data-testid="dashboard-tiles"]')
        .locator("button, a")
        .filter({ hasText: "Chores" })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('[data-testid="dashboard-tiles"]')
        .locator("button, a")
        .filter({ hasText: "Grocery" })
        .first()
    ).toBeVisible();
  });
});

test.describe("Premium — full module access", () => {
  // storageState comes from the project config (premium-admin.json)

  test("expenses page shows full module for premium users", async ({ page }) => {
    await page.goto("/expenses");
    // Premium users see the expense tracking UI, not the upgrade prompt
    await expect(page.locator("text=All square.")).toBeVisible();
  });
});
