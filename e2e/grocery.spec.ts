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
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill("Milk");
    await quickAddInput.press("Enter");
    await expect(page.locator("text=Milk")).toBeVisible();
  });

  test("can check off an item", async ({ page }) => {
    await page.goto("/grocery");
    // Add item first
    const quickAddInput = page.locator('[data-testid="grocery-quick-add"]');
    await quickAddInput.fill("Eggs");
    await quickAddInput.press("Enter");
    await expect(page.locator("text=Eggs")).toBeVisible();
    // Check it off — button has aria-label="Check item" when unchecked
    const checkbox = page.locator('button[aria-label="Check item"]').first();
    await checkbox.click();
    // Checked items appear under the collapsible "In the cart" section header
    await expect(page.locator("text=In the cart")).toBeVisible();
  });
});
