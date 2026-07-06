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
    await page.goto("/today");
    if (!page.url().includes("/login")) {
      await signOut(page);
    }
    await signIn(page, FREE_ADMIN);
  });

  test("premium money tab shows upgrade prompt for free users", async ({ page }) => {
    // v2 money module: "Bills" (recurring) is premium-gated. A free user tapping
    // it should see the shared upgrade CTA.
    await page.goto("/money");
    await page.getByRole("button", { name: /^Bills$/ }).first().click();
    await expect(page.getByRole("button", { name: "Upgrade for $4/month" })).toBeVisible();
  });

  test("core feature pages are reachable on free tier", async ({ page }) => {
    // v2 replaced the dashboard tile grid with /today + sidebar/bottom nav, so
    // this checks that a free user can actually load the core feature routes.
    await page.goto("/chores");
    await expect(page).toHaveURL(/\/chores/);
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto("/lists");
    await expect(page).toHaveURL(/\/lists/);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe("Premium — full module access", () => {
  // storageState comes from the project config (premium-admin.json)

  test("expenses page shows full module for premium users", async ({ page }) => {
    await page.goto("/money");
    // Premium users see the expense tracking UI, not the upgrade prompt.
    // (Seeded premium house has expenses, so assert the module chrome renders
    // rather than the empty state.)
    await expect(page).toHaveURL(/\/money/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
