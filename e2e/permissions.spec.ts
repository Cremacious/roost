/**
 * Permission and premium-gating tests.
 *
 * Verifies the layered permission model at the API level:
 *
 * Layer 1 — Authentication: unauthenticated requests → 401
 * Layer 2 — Premium gating: free tier → 403 on premium-only routes
 * Layer 3 — Role gating: child → 403 on financial routes; member → 403 on admin actions
 *
 * All tests use page.request so they exercise the actual server-side enforcement
 * and are not fooled by client-side UI gates. A premium-only page that "hides"
 * an action in the UI is only safe if the API also rejects unauthorized calls.
 *
 * Session fixtures used:
 * - e2e/.auth/free-admin.json   — admin of a FREE household (Roost Free House)
 * - e2e/.auth/premium-admin.json — admin of a PREMIUM household (Roost Premium House)
 * - e2e/.auth/member.json        — member of the free household
 * - e2e/.auth/child.json         — child of the free household (PIN login)
 */

import { test, expect } from "@playwright/test";

function statsRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Layer 1 — Auth: unauthenticated → 401
// ---------------------------------------------------------------------------

test.describe("Auth gate — unauthenticated requests", () => {
  // No storageState

  const protectedRoutes = [
    { method: "GET", path: "/api/chores" },
    { method: "GET", path: "/api/grocery/lists" },
    { method: "GET", path: "/api/expenses" },
    { method: "GET", path: "/api/tasks" },
    { method: "GET", path: "/api/notes" },
    { method: "GET", path: "/api/reminders" },
    { method: "GET", path: "/api/meals" },
    { method: "GET", path: "/api/stats" },
    { method: "GET", path: "/api/household/me" },
    { method: "GET", path: "/api/household/activity" },
  ];

  for (const { method, path } of protectedRoutes) {
    test(`${method} ${path} → 401`, async ({ page }) => {
      const res = await page.request.fetch(path, { method });
      expect(res.status()).toBe(401);
    });
  }
});

// ---------------------------------------------------------------------------
// Layer 2 — Premium gate: free user → 403 on premium routes
// ---------------------------------------------------------------------------

test.describe("Premium gate — free admin on premium-only routes", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("GET /api/stats → 403 for free household", async ({ page }) => {
    const { start, end } = statsRange();
    const res = await page.request.get(`/api/stats?start=${start}&end=${end}`);
    expect(res.status()).toBe(403);
  });

  test("GET /api/chores/history → 403 for free household", async ({ page }) => {
    const res = await page.request.get("/api/chores/history");
    expect(res.status()).toBe(403);
  });

  test("POST /api/expenses → 403 for free household", async ({ page }) => {
    // POST (create expense) is premium-only; GET (view list) is free
    const res = await page.request.post("/api/expenses", {
      data: {
        title: "Test expense",
        amount: 10,
        paidBy: "dummy-id",
        splits: [],
      },
    });
    expect(res.status()).toBe(403);
  });

  test("POST /api/expenses/scan → 403 for free household", async ({ page }) => {
    const res = await page.request.post("/api/expenses/scan", {
      data: { imageBase64: "data:image/jpeg;base64,abc123" },
    });
    expect(res.status()).toBe(403);
  });

  test("GET /api/expenses route is accessible for free users", async ({
    page,
  }) => {
    // GET /api/expenses (view list) is deliberately free
    const res = await page.request.get("/api/expenses");
    // Should be 200 or a premium message only on POST
    expect(res.status()).toBe(200);
  });
});

test.describe("Premium gate — premium admin can access premium routes", () => {
  test.use({ storageState: "e2e/.auth/premium-admin.json" });

  test("GET /api/stats → 200 for premium household", async ({ page }) => {
    const { start, end } = statsRange();
    const res = await page.request.get(`/api/stats?start=${start}&end=${end}`);
    expect(res.status()).toBe(200);
  });

  test("GET /api/chores/history → 200 for premium household", async ({
    page,
  }) => {
    const res = await page.request.get("/api/chores/history");
    expect(res.status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Layer 3a — Child role: financial routes always 403
// ---------------------------------------------------------------------------

test.describe("Child role gate — financial routes", () => {
  test.use({ storageState: "e2e/.auth/child.json" });

  test("child GET /api/expenses → 403", async ({ page }) => {
    const res = await page.request.get("/api/expenses");
    expect(res.status()).toBe(403);
  });

  test("child POST /api/expenses → 403", async ({ page }) => {
    const res = await page.request.post("/api/expenses", {
      data: { title: "Candy", amount: 1, paidBy: "dummy", splits: [] },
    });
    expect(res.status()).toBe(403);
  });

  test("child POST /api/expenses/scan → 403", async ({ page }) => {
    const res = await page.request.post("/api/expenses/scan", {
      data: { imageBase64: "abc" },
    });
    expect(res.status()).toBe(403);
  });

  test("child can access non-financial routes", async ({ page }) => {
    // Children can view chores and grocery lists
    const choresRes = await page.request.get("/api/chores");
    const groceryRes = await page.request.get("/api/grocery/lists");
    // Both should succeed (200) — not blocked for children
    expect(choresRes.status()).toBe(200);
    expect(groceryRes.status()).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Layer 3b — Member role: admin-only household actions are rejected
// ---------------------------------------------------------------------------

test.describe("Member role gate — admin-only actions", () => {
  test.use({ storageState: "e2e/.auth/member.json" });

  test("member cannot add a child account", async ({ page }) => {
    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "New Child" },
    });
    expect(res.status()).toBe(403);
  });

  test("member cannot create a guest invite link", async ({ page }) => {
    const res = await page.request.post("/api/household/invite", {
      data: { expires_in_days: 7 },
    });
    // 403 for non-admin, or 403 for non-premium — both are correct rejections
    expect([403]).toContain(res.status());
  });

  test("member can read chores and grocery lists", async ({ page }) => {
    const choresRes = await page.request.get("/api/chores");
    const groceryRes = await page.request.get("/api/grocery/lists");
    expect(choresRes.status()).toBe(200);
    expect(groceryRes.status()).toBe(200);
  });

  test("member can read their own household info", async ({ page }) => {
    const res = await page.request.get("/api/household/me");
    expect(res.status()).toBe(200);
    const body = await res.json() as { role?: string };
    expect(body.role).toBe("member");
  });
});

// ---------------------------------------------------------------------------
// Spot-check: premium features visible in UI for premium user
// ---------------------------------------------------------------------------

test.describe("Premium UI access — premium admin sees full modules", () => {
  test.use({ storageState: "e2e/.auth/premium-admin.json" });

  test("stats page renders for premium admin", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    // Premium user should see the stats module, not an upgrade gate
    await expect(page.locator("text=Upgrade to Premium")).not.toBeVisible();
    await expect(page.locator("body")).toBeVisible();
  });

  test("expenses page shows full module for premium admin", async ({ page }) => {
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText("All square.");
  });
});

test.describe("Premium UI gate — free admin sees upgrade prompts", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("expenses page shows upgrade prompt for free admin", async ({ page }) => {
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Recurring$/ }).click();
    const premiumGate = page.getByRole("dialog");
    await expect(
      premiumGate.getByRole("button", { name: "Upgrade for $4/month" })
    ).toBeVisible();
    await expect(premiumGate).toContainText("Unlock the full picture.");
  });

  test("stats page shows upgrade gate for free admin", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "Upgrade for $4/month" })
    ).toBeVisible();
    await expect(page.locator("body")).toContainText(
      "See how your household runs."
    );
  });
});
