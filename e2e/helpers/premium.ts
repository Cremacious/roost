import { Page } from "@playwright/test";

async function openDevPanel(page: Page): Promise<boolean> {
  // Use first() to avoid strict-mode error when "text=DEV" matches button + inner nodes
  const devBtn = page.locator("text=DEV").first();
  const isVisible = await devBtn.isVisible().catch(() => false);
  if (!isVisible) return false;

  // Panel may already be open — check if toggle is visible first
  const alreadyOpen = await page
    .locator('[data-testid="premium-toggle"]')
    .isVisible()
    .catch(() => false);

  if (!alreadyOpen) {
    await devBtn.click();
    await page.waitForTimeout(300);
  }

  return page
    .locator('[data-testid="premium-toggle"]')
    .isVisible()
    .catch(() => false);
}

export async function enablePremium(page: Page) {
  const panelOpen = await openDevPanel(page);

  if (!panelOpen) {
    console.log("Premium toggle not found, skipping premium enable");
    return;
  }

  const toggle = page.locator('[data-testid="premium-toggle"]');
  const isPremium = await toggle.isChecked().catch(() => false);

  if (!isPremium) {
    await toggle.click();
    await page.waitForTimeout(500);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

export async function disablePremium(page: Page) {
  const panelOpen = await openDevPanel(page);

  if (!panelOpen) {
    console.log("Premium toggle not found, skipping premium disable");
    return;
  }

  const toggle = page.locator('[data-testid="premium-toggle"]');
  const isPremium = await toggle.isChecked().catch(() => false);

  if (isPremium) {
    await toggle.click();
    await page.waitForTimeout(500);
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}
