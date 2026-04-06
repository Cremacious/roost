import { test, expect } from "@playwright/test";
import { signUp, createHousehold } from "./helpers/auth";
import { disablePremium, enablePremium } from "./helpers/premium";

const uniqueUser = () => ({
  name: "Premium User",
  email: `premium-${Date.now()}@example.com`,
  password: "PremiumPass123!",
});

test.describe("Premium gating", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, uniqueUser());
    await createHousehold(page);
    await disablePremium(page);
  });

  test("expenses page shows upgrade prompt for free users", async ({ page }) => {
    await page.goto("/expenses");
    // Free users see an inline upgrade pitch, not the full module
    await expect(
      page.locator("text=Upgrade to Premium")
        .or(page.locator("text=Upgrade for $3/month"))
        .first()
    ).toBeVisible();
  });

  test("dashboard tiles are visible on free tier", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.locator('[data-testid="dashboard-tiles"]').locator("button, a").filter({ hasText: "Chores" }).first()
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="dashboard-tiles"]').locator("button, a").filter({ hasText: "Grocery" }).first()
    ).toBeVisible();
  });

  test("enabling premium shows full expenses module", async ({ page }) => {
    await enablePremium(page);
    await page.goto("/expenses");
    // Premium users see the expense tracking UI
    await expect(page.locator("text=All square.")).toBeVisible();
  });
});
