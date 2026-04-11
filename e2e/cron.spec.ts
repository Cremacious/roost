/**
 * Cron job smoke tests — API-level coverage for all active Vercel cron routes.
 *
 * Active routes (from vercel.json):
 *   /api/cron/reminders          — every 15 minutes
 *   /api/cron/rewards            — nightly 11pm UTC
 *   /api/cron/subscription       — daily midnight UTC
 *   /api/cron/settlement-reminders — daily 10am UTC
 *   /api/cron/recurring-expenses — daily 8am UTC
 *   /api/cron/budget-reset       — 1st of month midnight UTC
 *   /api/cron/guest-expiry       — daily 2am UTC
 *
 * Two assertions per route:
 *   1. No Authorization header → 401
 *   2. Valid Bearer token → 200 + expected numeric fields in response
 *
 * CRON_SECRET is resolved from process.env (CI/shell) or parsed from
 * .env.local (local dev). Authorized tests are skipped automatically when
 * the secret cannot be resolved so they never produce false failures in
 * environments without the secret.
 *
 * NOTE: These tests call real DB-backed cron handlers. They are idempotent
 * by design — running when there is nothing to process returns 0-counts,
 * not errors. No data is mutated in a way that affects other test specs.
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Resolve CRON_SECRET
// ---------------------------------------------------------------------------

function resolveCronSecret(): string {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^CRON_SECRET=(.+)$/m);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

const CRON_SECRET = resolveCronSecret();
const cronHeaders = { Authorization: `Bearer ${CRON_SECRET}` };

// ---------------------------------------------------------------------------
// Auth — every cron route rejects unauthenticated requests
// ---------------------------------------------------------------------------

test.describe("Cron routes — unauthenticated requests rejected", () => {
  const cronRoutes = [
    "/api/cron/reminders",
    "/api/cron/rewards",
    "/api/cron/subscription",
    "/api/cron/settlement-reminders",
    "/api/cron/recurring-expenses",
    "/api/cron/budget-reset",
    "/api/cron/guest-expiry",
  ];

  for (const route of cronRoutes) {
    test(`GET ${route} without auth → 401`, async ({ page }) => {
      const res = await page.request.get(route);
      expect(res.status()).toBe(401);
    });
  }

  test("GET /api/cron/reminders with wrong secret → 401", async ({ page }) => {
    const res = await page.request.get("/api/cron/reminders", {
      headers: { Authorization: "Bearer totally-wrong-secret" },
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Authorized execution — each cron runs without crashing
// ---------------------------------------------------------------------------

test.describe("Cron routes — authorized execution", () => {
  test.skip(!CRON_SECRET, "CRON_SECRET not available in test process — set in env or .env.local");

  test("GET /api/cron/reminders → 200 with numeric processed count", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/reminders", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { processed: unknown };
    expect(typeof body.processed).toBe("number");
  });

  test("GET /api/cron/rewards → 200 with numeric processed count and payouts array", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/rewards", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      processed: unknown;
      payouts: unknown;
    };
    expect(typeof body.processed).toBe("number");
    expect(Array.isArray(body.payouts)).toBe(true);
  });

  test("GET /api/cron/subscription → 200 with numeric expired count", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/subscription", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { expired: unknown };
    expect(typeof body.expired).toBe("number");
  });

  test("GET /api/cron/settlement-reminders → 200 with numeric reminded count", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/settlement-reminders", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { reminded: unknown };
    expect(typeof body.reminded).toBe("number");
  });

  test("GET /api/cron/recurring-expenses → 200 with created/skipped/reminded counts", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/recurring-expenses", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      created: unknown;
      skipped: unknown;
      reminded: unknown;
    };
    expect(typeof body.created).toBe("number");
    expect(typeof body.skipped).toBe("number");
    expect(typeof body.reminded).toBe("number");
  });

  test("GET /api/cron/budget-reset → 200 with numeric reset count", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/budget-reset", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { reset: unknown };
    expect(typeof body.reset).toBe("number");
  });

  test("GET /api/cron/guest-expiry → 200 with numeric expired count and timestamp", async ({
    page,
  }) => {
    const res = await page.request.get("/api/cron/guest-expiry", {
      headers: cronHeaders,
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { expired: unknown; timestamp: unknown };
    expect(typeof body.expired).toBe("number");
    expect(typeof body.timestamp).toBe("string");
  });
});
