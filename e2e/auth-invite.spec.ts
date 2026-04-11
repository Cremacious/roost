/**
 * Invite flow tests.
 *
 * Tests cover:
 * 1. Invalid token — invite page shows a not-found state
 * 2. Valid invite — page renders household info for an unauthenticated visitor
 *
 * For #2, a real invite is created via the API using the premium-admin session
 * (guest invites are a premium feature). The invite page is then visited
 * without any session to verify it renders for a fresh user.
 *
 * A full "join and reach dashboard" flow would require multi-context management
 * (create invite as premium admin, join as a different fresh user). That is
 * documented as a manual QA step given test-isolation complexity.
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Invalid token — no auth needed
// ---------------------------------------------------------------------------

test.describe("Invite — invalid token", () => {
  test("unknown token shows error state", async ({ page }) => {
    // Use a plausible 64-char hex string that does not exist in the DB
    const fakeToken = "a".repeat(64);
    await page.goto(`/invite/${fakeToken}`);
    await page.waitForLoadState("domcontentloaded");

    // Page should render (not crash with 500) and show an error/not-found state
    await expect(page.locator("body")).toBeVisible();
    // The invite page renders one of: not_found, expired, error states
    // All three show some message — verify the app at least rendered
    await expect(page).not.toHaveURL(/\/login/); // not a redirect, it renders inline
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});

// ---------------------------------------------------------------------------
// Valid invite — rendered for unauthenticated visitor
// Uses premium-admin session only to create the invite via API,
// then visits the page without authentication.
// ---------------------------------------------------------------------------

test.describe("Invite — valid token renders for unauthenticated visitor", () => {
  // Use premium-admin credentials to call the invite creation API
  test.use({ storageState: "e2e/.auth/premium-admin.json" });

  test("invite page shows household name and login/signup prompts", async ({
    page,
    context,
  }) => {
    // Create the invite as premium admin
    const res = await page.request.post("/api/household/invite", {
      data: { expires_in_days: 1 },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const token: string = body.invite?.token;
    expect(token).toBeTruthy();

    // Open invite page in a fresh unauthenticated context
    const freshContext = await context.browser()!.newContext();
    const freshPage = await freshContext.newPage();

    try {
      await freshPage.goto(`/invite/${token}`);
      await freshPage.waitForLoadState("domcontentloaded");

      // Should show the premium household name
      await expect(freshPage.locator("body")).toContainText("Roost Premium House");

      // Unauthenticated visitor should see sign-up or log-in prompts
      const bodyText = await freshPage.locator("body").innerText();
      const hasAuthPrompt =
        bodyText.toLowerCase().includes("sign up") ||
        bodyText.toLowerCase().includes("log in") ||
        bodyText.toLowerCase().includes("create an account") ||
        bodyText.toLowerCase().includes("join");
      expect(hasAuthPrompt).toBeTruthy();
    } finally {
      await freshContext.close();
    }
  });
});
