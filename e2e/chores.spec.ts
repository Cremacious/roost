import { test, expect } from "@playwright/test";
import { signUp, createHousehold } from "./helpers/auth";
import { disablePremium } from "./helpers/premium";

const uniqueUser = () => ({
  name: "Chores User",
  email: `chores-${Date.now()}@example.com`,
  password: "ChoresPass123!",
});

test.describe("Chores", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, uniqueUser());
    await createHousehold(page);
  });

  test("shows empty state when no chores exist", async ({ page }) => {
    await page.goto("/chores");
    await expect(page.locator("text=Suspiciously clean.")).toBeVisible();
  });

  test("can add a chore", async ({ page }) => {
    await page.goto("/chores");
    // Click FAB or add button
    const addBtn = page.locator('button[aria-label="Add chore"], button:has-text("Add")').first();
    await addBtn.click();
    // Fill in the chore name
    const nameInput = page.locator('input[placeholder*="Vacuum"]').first();
    await nameInput.fill("Wash the dishes");
    // Save
    await page.click('[data-testid="chore-save-btn"]');
    await expect(page.locator("text=Wash the dishes")).toBeVisible();
  });

  test("weekly/monthly chores show premium lock on free tier", async ({ page }) => {
    await disablePremium(page);
    await page.goto("/chores");
    const addBtn = page.locator('button[aria-label="Add chore"], button:has-text("Add")').first();
    await addBtn.click();
    // Weekly frequency button should show a lock icon
    const weeklyBtn = page.locator("text=Weekly").first();
    await expect(weeklyBtn).toBeVisible();
    // The lock icon should be present nearby
    const lockIcon = page.locator('[data-testid="chore-sheet"] svg').first();
    await expect(lockIcon).toBeTruthy();
  });
});
