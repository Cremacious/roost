import { Page } from "@playwright/test";

export async function enablePremium(page: Page) {
  // DevTools is only shown in dev. Toggle the premium switch.
  const toggle = page.locator('[data-testid="premium-toggle"]');
  const isPremium = await toggle.isChecked().catch(() => false);
  if (!isPremium) {
    await toggle.click();
    // Wait a moment for the API call to settle
    await page.waitForTimeout(500);
  }
}

export async function disablePremium(page: Page) {
  const toggle = page.locator('[data-testid="premium-toggle"]');
  const isPremium = await toggle.isChecked().catch(() => false);
  if (isPremium) {
    await toggle.click();
    await page.waitForTimeout(500);
  }
}
