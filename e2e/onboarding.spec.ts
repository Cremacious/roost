import { test, expect } from "@playwright/test";
import { signUp } from "./helpers/auth";

const uniqueUser = () => ({
  name: "Onboarding User",
  email: `onboarding-${Date.now()}@example.com`,
  password: "OnboardPass123!",
});

test.describe("Onboarding", () => {
  test("shows create and join household options", async ({ page }) => {
    await signUp(page, uniqueUser());
    await expect(page).toHaveURL("/onboarding");
    await expect(page.locator("text=Create a household")).toBeVisible();
    await expect(page.locator("text=Join")).toBeVisible();
  });

  test("creating a household reaches the dashboard", async ({ page }) => {
    await signUp(page, uniqueUser());
    await page.click("text=Create a household");
    const householdInput = page.locator('input[placeholder*="house"]').first();
    await householdInput.fill("My Test House");
    await page.click("text=Create household");
    await expect(page).toHaveURL("/dashboard");
  });
});
