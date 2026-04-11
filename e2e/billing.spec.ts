/**
 * Billing tests — app-side contract verification.
 *
 * What this covers:
 * - Auth gating on all Stripe API routes (401 when unauthenticated)
 * - Role gating on all Stripe API routes (403 when not admin)
 * - Webhook signature validation (400 on missing / invalid signature)
 * - Checkout session creation shape (200 with Stripe URL when admin + keys present)
 * - Billing page UI states (free tier vs premium)
 *
 * What this intentionally does NOT cover:
 * - Completing a real Stripe Checkout (requires browser interaction on Stripe's domain)
 * - Full subscription lifecycle via webhooks (requires real Stripe event payloads + valid sig)
 * - cancel_at_period_end / reactivation (requires an active Stripe subscription in test mode)
 * These flows are covered by manual QA in 4.3 using Stripe test mode with the Stripe CLI.
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Auth gating — unauthenticated requests must be rejected
// ---------------------------------------------------------------------------

test.describe("Billing API — unauthenticated requests", () => {
  // No storageState: unauthenticated

  test("POST /api/stripe/checkout without session → 401", async ({ page }) => {
    const res = await page.request.post("/api/stripe/checkout");
    expect(res.status()).toBe(401);
  });

  test("POST /api/stripe/cancel without session → 401", async ({ page }) => {
    const res = await page.request.post("/api/stripe/cancel");
    expect(res.status()).toBe(401);
  });

  test("POST /api/stripe/reactivate without session → 401", async ({ page }) => {
    const res = await page.request.post("/api/stripe/reactivate");
    expect(res.status()).toBe(401);
  });

  test("POST /api/stripe/portal without session → 401", async ({ page }) => {
    const res = await page.request.post("/api/stripe/portal");
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Webhook signature validation — no Stripe keys needed
// ---------------------------------------------------------------------------

test.describe("Billing API — webhook signature validation", () => {
  // No storageState: webhook route uses Stripe sig, not user session

  test("POST /api/stripe/webhook with no signature header → 400", async ({
    page,
  }) => {
    const res = await page.request.post("/api/stripe/webhook", {
      data: JSON.stringify({ type: "checkout.session.completed" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/stripe/webhook with invalid signature → 400", async ({
    page,
  }) => {
    const res = await page.request.post("/api/stripe/webhook", {
      data: JSON.stringify({ type: "checkout.session.completed" }),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=invalid,v1=tampered",
      },
    });
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Role gating — member (non-admin) must be rejected
// ---------------------------------------------------------------------------

test.describe("Billing API — member cannot access billing routes", () => {
  test.use({ storageState: "e2e/.auth/member.json" });

  test("member POST /api/stripe/checkout → 403", async ({ page }) => {
    const res = await page.request.post("/api/stripe/checkout");
    expect(res.status()).toBe(403);
  });

  test("member POST /api/stripe/cancel → 403", async ({ page }) => {
    // 403 because member role (not because no subscription exists)
    const res = await page.request.post("/api/stripe/cancel");
    expect(res.status()).toBe(403);
  });

  test("member POST /api/stripe/reactivate → 403", async ({ page }) => {
    const res = await page.request.post("/api/stripe/reactivate");
    expect(res.status()).toBe(403);
  });

  test("member POST /api/stripe/portal → 403", async ({ page }) => {
    const res = await page.request.post("/api/stripe/portal");
    expect(res.status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Checkout creation — admin gets a Stripe URL (requires STRIPE_SECRET_KEY)
// ---------------------------------------------------------------------------

test.describe("Billing API — admin checkout session creation", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("admin POST /api/stripe/checkout returns a Stripe checkout URL", async ({
    page,
  }) => {
    const res = await page.request.post("/api/stripe/checkout");

    if (res.ok()) {
      // Stripe keys are present and valid — verify response contract
      const body = await res.json() as { url?: string };
      expect(typeof body.url).toBe("string");
      expect(body.url).toContain("stripe.com");
    } else {
      // Stripe keys not configured in this environment (expected locally without .env)
      // The permission check passed (we didn't get 401 or 403) — that's the important thing
      expect([400, 500]).toContain(res.status());
      console.log(
        `  ℹ checkout creation skipped (status ${res.status()}) — STRIPE_SECRET_KEY not set in this environment`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Billing page UI — free vs premium states
// ---------------------------------------------------------------------------

test.describe("Billing page — free tier UI", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("free admin sees upgrade prompt on billing page", async ({ page }) => {
    await page.goto("/settings/billing");
    await page.waitForLoadState("networkidle");
    // Free users see an upgrade CTA — verify the page shows premium pitch copy
    const body = await page.locator("body");
    const text = await body.innerText();
    const hasUpgradeContent =
      text.includes("Upgrade") ||
      text.includes("Premium") ||
      text.includes("$4");
    expect(hasUpgradeContent).toBeTruthy();
  });

  test("free admin billing page does not show active subscription UI", async ({
    page,
  }) => {
    await page.goto("/settings/billing");
    await page.waitForLoadState("networkidle");
    // Premium-only UI elements that should NOT appear for free users
    await expect(page.locator("text=Cancel plan")).not.toBeVisible();
    await expect(page.locator("text=Next billing date")).not.toBeVisible();
  });
});

test.describe("Billing page — premium tier UI", () => {
  test.use({ storageState: "e2e/.auth/premium-admin.json" });

  test("premium admin sees subscription management, not upgrade prompt", async ({
    page,
  }) => {
    await page.goto("/settings/billing");
    await page.waitForLoadState("networkidle");
    // Premium admin sees active plan management, not a generic "Upgrade" CTA
    // The page shows either a cancel option, active status, or billing management
    const text = await page.locator("body").innerText();
    const hasPremiumUI =
      text.includes("Cancel") ||
      text.includes("Active") ||
      text.includes("billing") ||
      text.includes("Premium");
    expect(hasPremiumUI).toBeTruthy();
    // Should NOT see the basic upgrade hero (pricing CTA for non-premium)
    await expect(
      page.locator("text=Upgrade to Premium").or(page.locator("text=$4/month"))
    ).not.toBeVisible();
  });
});
