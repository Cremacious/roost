# Testing Patterns

**Analysis Date:** 2026-05-01

## Test Framework

**Unit/Integration Runner:**
- Jest 30 with `ts-jest` preset
- Config: `jest.config.ts` (primary) and `jest.config.js` (alias used by `npm test` script)
- Test environment: `jsdom`
- Setup file: `jest.setup.ts` — imports `@testing-library/jest-dom` for DOM matchers

**E2E Runner:**
- Playwright 1.59 (`@playwright/test`)
- Config: `playwright.config.ts`
- Output: `.playwright/test-results/`, `.playwright/report/`

**Assertion Libraries:**
- Jest: built-in `expect` + `@testing-library/jest-dom` matchers (e.g. `toBeInTheDocument`, `toBeVisible`)
- Playwright: built-in `expect` from `@playwright/test`

**Run Commands:**
```bash
npm test                  # Run all Jest unit tests
npm run test:watch        # Jest watch mode
npm run test:coverage     # Jest with coverage report
npm run test:e2e          # Run all Playwright tests
npm run test:e2e:ui       # Playwright interactive UI mode
npm run test:e2e:headed   # Playwright with visible browser
```

## Test File Organization

**Unit tests location:** `src/__tests__/` — entirely separate from source, NOT co-located

**Unit test directory layout:**
```
src/__tests__/
├── algorithms/
│   ├── allowance.test.ts       # FREE_TIER_LIMITS constants + completion rate logic
│   └── debtSimplification.test.ts  # Debt simplification algorithm
├── components/
│   └── MemberAvatar.test.tsx   # Component rendering tests
├── utils/
│   └── time.test.ts            # relativeTime() utility
├── env.test.ts                 # Environment variable helpers
└── security.test.ts            # CSP + request security helpers
```

**E2E tests location:** `e2e/` at the project root

**E2E directory layout:**
```
e2e/
├── helpers/
│   ├── auth.ts         # signUp, signIn, signOut, createHousehold + seed account constants
│   ├── cleanup.ts      # cleanupPlaywrightTestData() — removes Playwright-created test accounts
│   └── premium.ts      # enablePremium, disablePremium via DevTools panel
├── auth.spec.ts
├── auth-child.spec.ts
├── auth-email-change.spec.ts
├── auth-invite.spec.ts
├── billing.spec.ts
├── chores.spec.ts
├── cron.spec.ts
├── global-setup.ts     # Seeds DB + saves auth state files to e2e/.auth/
├── global-teardown.ts
├── grocery.spec.ts
├── household.spec.ts
├── navigation.spec.ts
├── onboarding.spec.ts
├── permissions.spec.ts
└── premium.spec.ts
```

**Naming:**
- Unit: `[subject].test.ts` or `[subject].test.tsx`
- E2E: `[feature].spec.ts`

## Unit Test Structure

**Suite Organization:**
```typescript
import { relativeTime } from "@/lib/utils/time";

describe("relativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'Just now' for dates within the last minute", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    jest.setSystemTime(now.getTime());
    const thirtySecondsAgo = new Date("2026-01-01T11:59:30Z");
    expect(relativeTime(thirtySecondsAgo)).toBe("Just now");
  });
});
```

**Patterns:**
- `describe()` groups by the module/function under test
- `it()` for individual cases (not `test()`)
- `beforeEach` / `afterEach` for timer and environment setup/teardown
- Each test is self-contained — no shared mutable state between tests

**Component Tests:**
```typescript
import React from "react";
import { render, screen } from "@testing-library/react";
import MemberAvatar from "@/components/shared/MemberAvatar";

describe("MemberAvatar", () => {
  it("renders first and last initials from a full name", () => {
    render(<MemberAvatar name="Alice Johnson" />);
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });
});
```

## Mocking

**Framework:** Jest built-in (`jest.useFakeTimers()`, `jest.setSystemTime()`)

**Timer mocking pattern:**
```typescript
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });
// In test:
jest.setSystemTime(new Date("2026-01-01T12:00:00Z").getTime());
```

**Environment variable mocking:**
```typescript
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

// In test:
delete process.env.NEXT_PUBLIC_APP_URL;
process.env.STRIPE_SECRET_KEY = "sk_test_ci_placeholder";
```

**Dynamic imports for env-dependent modules:**
```typescript
// Use dynamic import AFTER setting env vars so the module re-evaluates
const { getAppUrl } = await import("@/lib/env");
```

**Request mocking (security tests):**
```typescript
function createRequestLike(
  url: string,
  headers: Record<string, string> = {}
): Request {
  return {
    headers: new Headers(headers),
    url,
  } as Request;
}
```

**What to Mock:**
- System time (`jest.useFakeTimers`) for anything using `new Date()` or `Date.now()`
- `process.env` for environment-dependent helpers
- External HTTP calls are not mocked in unit tests — those are covered by E2E

**What NOT to Mock:**
- Pure utility functions (test them directly)
- DB calls (no unit tests cover DB — only E2E tests exercise the full stack)
- Component rendering (render with `@testing-library/react` against real component)

## E2E Test Structure

**Suite Organization:**
```typescript
import { test, expect } from "@playwright/test";
import { signIn, signOut, FREE_ADMIN } from "./helpers/auth";

test.describe("Auth flows — signed in", () => {
  // Override storageState for this describe block only
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("signed-in user visiting /login is redirected to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

**Patterns:**
- `test.describe()` groups by feature/flow
- `test.use({ storageState })` overrides auth context per describe block
- URL assertions use regex patterns (`/\/dashboard/`) not exact strings
- `waitForURL` uses function predicates for multi-path conditions:
  ```typescript
  await page.waitForURL(
    (url) => url.pathname.includes("/onboarding") || url.pathname.includes("/dashboard"),
    { timeout: 45000 }
  );
  ```
- `glob` patterns (`**/dashboard`) for `waitForURL` to handle baseURL prefixes

**Auth State Strategy:**
- Seed accounts defined in `src/db/seed.ts` — idempotent, run via `npm run db:seed`
- Four auth state files saved by `e2e/global-setup.ts`:
  - `e2e/.auth/free-admin.json` — admin of free household (`admin.free@roost.test`)
  - `e2e/.auth/premium-admin.json` — admin of premium household (`admin.premium@roost.test`)
  - `e2e/.auth/member.json` — member of free household (`member@roost.test`)
  - `e2e/.auth/child.json` — child account (PIN login, no email)
- All passwords: `RoostTest123!`
- Auth state files are in `.gitignore`; tracked directory via `e2e/.auth/.gitkeep`

**Projects (playwright.config.ts):**

| Project | Devices | Auth | Specs |
|---|---|---|---|
| `free` | Desktop Chrome | `free-admin.json` | navigation, chores, grocery |
| `premium` | Desktop Chrome | `premium-admin.json` | premium.spec |
| `unauthenticated` | Desktop Chrome | none | auth, onboarding, child, invite, billing, permissions, household, cron |
| `mobile` | iPhone 14 | none | auth, onboarding |
| `mobile-premium` | iPhone 14 | `premium-admin.json` | premium.spec |

**Serial execution:** `fullyParallel: false`, `workers: 1` — prevents context-crash cascades.

## Fixtures and Factories

**Seed Accounts (fixed — do NOT use timestamp emails for these roles):**
```typescript
export const FREE_ADMIN = {
  email: "admin.free@roost.test",
  password: "RoostTest123!",
  name: "Free Admin",
};

export const PREMIUM_ADMIN = {
  email: "admin.premium@roost.test",
  password: "RoostTest123!",
  name: "Premium Admin",
};
```

**Fresh user factory (for signup flow tests only):**
```typescript
// Must be a factory FUNCTION, not a plain object
// Reusing the same email across tests causes "email already exists" failures
const freshUser = () => ({
  name: "Auth Test User",
  email: `auth-${Date.now()}@roost.test`,
  password: "RoostTest123!",
});
```

**Timestamped item names (for add/check tests):**
```typescript
const itemName = `Milk ${Date.now()}`;  // Unique within a run
```

**Test data cleanup:**
- `e2e/helpers/cleanup.ts` — `cleanupPlaywrightTestData()` removes accounts created by E2E tests
- Called at the start of `global-setup.ts` before seeding
- Test filter patterns are centralized in `src/lib/admin/testFilters.ts`

## E2E Helper Patterns

**signUp helper:**
```typescript
export async function signUp(page: Page, user: { name: string; email: string; password: string }) {
  await page.goto("/signup");
  await page.waitForLoadState("domcontentloaded");
  const nameInput = page.locator('input[placeholder="What should we call you?"]');
  await nameInput.click();
  // pressSequentially (not fill) for mobile WebKit React onChange compatibility
  await nameInput.pressSequentially(user.name, { delay: 30 });
  await page.fill('input[type="email"]', user.email);
  // ... fill passwords
  await page.click('[data-testid="signup-submit"]');
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForURL((url) => url.pathname.includes("/onboarding") || ..., { timeout: 45000 });
}
```

**signOut helper:**
```typescript
export async function signOut(page: Page) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await page.waitForURL("**/login", { timeout: 15000 });
}
```

**Premium toggle helper (DevTools panel):**
```typescript
// Must open DevTools panel first via "DEV" pill, then interact with toggle
export async function enablePremium(page: Page) { ... }
export async function disablePremium(page: Page) { ... }
```

## API-Level Permission Tests

`e2e/permissions.spec.ts` exercises the three-layer permission model directly via `page.request`:

```typescript
// Layer 1 — Auth: unauthenticated → 401
test("GET /api/chores → 401", async ({ page }) => {
  const res = await page.request.fetch("/api/chores", { method: "GET" });
  expect(res.status()).toBe(401);
});

// Layer 2 — Premium: free user → 403
test.describe("Premium gate", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });
  test("GET /api/stats → 403 for free household", async ({ page }) => {
    const res = await page.request.get("/api/stats?start=...&end=...");
    expect(res.status()).toBe(403);
  });
});

// Layer 3 — Role: child → 403 on financial routes
test.describe("Child role gate", () => {
  test.use({ storageState: "e2e/.auth/child.json" });
  test("POST /api/expenses → 403 for child", async ({ page }) => { ... });
});
```

## Coverage

**Requirements:** No enforced coverage threshold

**View Coverage:**
```bash
npm run test:coverage
```

Coverage output: `coverage/` directory (excluded from ESLint/git tracking)

## Test Types

**Unit Tests (`src/__tests__/`):**
- Pure utility functions: `relativeTime`, `simplifyDebts`, `calcCompletionRate`
- Pure constants: `FREE_TIER_LIMITS`
- Simple component rendering: `MemberAvatar` (no mocked API calls)
- Security helpers: CSP builder, IP allowlist, origin check
- Environment helpers: `getAppUrl`, `isStripeConfigured`
- No DB calls, no network calls

**E2E Tests (`e2e/`):**
- Full browser flows: signup, login, onboarding, household creation
- Feature CRUD: add chore, add grocery item, check item off
- Navigation smoke tests: all 9 app routes load without errors
- Permission enforcement: API returns correct 401/403 at all three layers
- Premium gating: UI shows upgrade gate; API rejects free-tier requests
- Billing: Stripe checkout flow, cancel/reactivate
- Child auth: PIN login flow
- Guest invites: invite link acceptance

**Integration Tests:**
- None distinct from E2E — the E2E suite covers integration scenarios

## Common Patterns

**Async Testing (Jest):**
```typescript
it("detects configured receipt scanning credentials", async () => {
  process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = "https://...";
  const { isAzureReceiptScanningConfigured } = await import("@/lib/env");
  expect(isAzureReceiptScanningConfigured()).toBe(true);
});
```

**Error Testing (Jest):**
```typescript
it("rejects cross-origin requests", () => {
  const request = createRequestLike("https://roost.test/api/admin/login", {
    origin: "https://evil.test",
  });
  expect(isSameOriginRequest(request)).toBe(false);
});
```

**Waiting for navigation (Playwright):**
```typescript
// Prefer regex URLs for robustness:
await expect(page).toHaveURL(/\/dashboard/);

// Use function predicate for OR conditions:
await page.waitForURL(
  (url) => url.pathname.includes("/onboarding") || url.pathname.includes("/dashboard"),
  { timeout: 45000 }
);

// Add networkidle before waitForURL on submit actions:
await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
await page.waitForURL("**/dashboard", { timeout: 30000 });
```

**Avoiding strict mode violations (Playwright):**
```typescript
// Use .first() when multiple elements may match
const addBtn = page.locator('button[aria-label="Add chore"], button:has-text("Add")').first();
const devBtn = page.locator("text=DEV").first();

// Use .filter({ hasText }) to narrow results
const dashboardTile = page.locator('button, a').filter({ hasText: 'Chores' }).first();
```

**test.use() for per-block auth override:**
```typescript
test.describe("Signed-in redirects", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });
  // All tests in this block run with the free admin session
});
```

## Known Gaps

- **DB-state-dependent tests:** Empty-state tests (chores, grocery) only pass reliably on the first run against a clean DB. Test data accumulates with shared seed accounts across runs.
- **No unit tests for API route handlers** — only E2E tests exercise routes end-to-end.
- **No unit tests for Drizzle queries** — query correctness verified only through E2E.
- **No visual regression tests** — theme system and CSS variables not covered by any automated test.
- **Child auth state** saved in `e2e/.auth/child.json` may be unreliable if `Test Child` is not present in the seed data; `global-setup.ts` logs a warning and skips saving rather than failing hard.

---

*Testing analysis: 2026-05-01*
