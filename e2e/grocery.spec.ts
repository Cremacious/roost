import { test, expect } from "@playwright/test";
import { signUp, createHousehold } from "./helpers/auth";

const uniqueUser = () => ({
  name: "Grocery User",
  email: `grocery-${Date.now()}@example.com`,
  password: "GroceryPass123!",
});

test.describe("Grocery", () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, uniqueUser());
    await createHousehold(page);
  });

  test("shows empty state when no items exist", async ({ page }) => {
    await page.goto("/grocery");
    await expect(page.locator("text=The fridge is on its own.")).toBeVisible();
  });

  test("can quick add an item", async ({ page }) => {
    await page.goto("/grocery");
    const quickAddInput = page.locator('input[placeholder*="Add an item"]').first();
    await quickAddInput.fill("Milk");
    await quickAddInput.press("Enter");
    await expect(page.locator("text=Milk")).toBeVisible();
  });

  test("can check off an item", async ({ page }) => {
    await page.goto("/grocery");
    // Add item first
    const quickAddInput = page.locator('input[placeholder*="Add an item"]').first();
    await quickAddInput.fill("Eggs");
    await quickAddInput.press("Enter");
    await expect(page.locator("text=Eggs")).toBeVisible();
    // Check it off
    const checkbox = page.locator('[role="checkbox"], button[aria-label*="check"]').first();
    await checkbox.click();
    // Item should move to checked section or be visually checked
    await expect(page.locator("text=Checked")).toBeVisible();
  });
});
