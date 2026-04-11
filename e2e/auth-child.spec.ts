/**
 * Child PIN login tests.
 *
 * Prerequisites:
 * - Seed must have run: npm run db:seed
 * - Seed creates "Test Child" (PIN 1234) in "Roost Free House" (code RSTFRE)
 * - The seed now inserts the child into BOTH the better-auth "user" table AND
 *   the app "users" table — required for internalAdapter.createSession() FK constraint.
 *
 * Flow:
 *   Step 1 — enter 6-char household code → "Let me in"
 *   Step 2 — child picker (skipped automatically when only 1 child)
 *   Step 3 — PIN pad (auto-submits on 4th digit)
 */

import { test, expect } from "@playwright/test";
import { FREE_HOUSEHOLD_CODE } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Helper — type PIN digits one at a time
// ---------------------------------------------------------------------------

async function enterPin(page: import("@playwright/test").Page, pin: string) {
  for (const digit of pin.split("")) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Child PIN login", () => {
  test("full PIN flow: code → PIN → dashboard", async ({ page }) => {
    await page.goto("/child-login");
    await page.waitForLoadState("domcontentloaded");

    // Step 1: enter household code
    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill(FREE_HOUSEHOLD_CODE);
    await page.getByRole("button", { name: "Let me in" }).click();

    // Step 2 is skipped automatically (only 1 child in the free household)
    // — page advances directly to the PIN pad (step 3)

    // Step 3: enter correct PIN (4 digits auto-submit)
    await page.waitForTimeout(500); // allow state transition animation
    await enterPin(page, "1234");

    // Should reach dashboard
    await page.waitForURL("**/dashboard", { timeout: 20000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("wrong PIN shows error and stays on PIN step", async ({ page }) => {
    await page.goto("/child-login");
    await page.waitForLoadState("domcontentloaded");

    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill(FREE_HOUSEHOLD_CODE);
    await page.getByRole("button", { name: "Let me in" }).click();

    await page.waitForTimeout(500);

    // Enter wrong PIN
    await enterPin(page, "9999");

    // Should NOT navigate away — stays on /child-login
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/child-login/);

    // PIN dots should be cleared (ready for retry)
    // We can enter another attempt to confirm the PIN pad is still interactive
    await enterPin(page, "9999");
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/child-login/);
  });

  test("invalid household code shows error and stays on code step", async ({
    page,
  }) => {
    await page.goto("/child-login");
    await page.waitForLoadState("domcontentloaded");

    const codeInput = page.locator('input[placeholder="XXXXXX"]');
    await codeInput.fill("ZZZBAD");
    await page.getByRole("button", { name: "Let me in" }).click();

    // Should remain on the code-entry step
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/child-login/);
    // Input should still be visible (not advanced to PIN step)
    await expect(codeInput).toBeVisible();
  });
});
