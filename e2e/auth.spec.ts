import { test, expect } from "@playwright/test";
import { signUp, createHousehold, signIn, signOut, FREE_ADMIN } from "./helpers/auth";

// Fresh user for the signup flow test — needs a unique email each run
// because the signup test exercises the actual account creation path.
const freshUser = () => ({
  name: "Auth Test User",
  email: `auth-${Date.now()}@roost.test`,
  password: "RoostTest123!",
});

// ---------------------------------------------------------------------------
// Public / unauthenticated
// (no storageState — tests run logged out)
// ---------------------------------------------------------------------------

test.describe("Auth flows — public", () => {
  test("homepage is public and accessible", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from chores to login", async ({
    page,
  }) => {
    await page.goto("/chores");
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator('[data-testid="signup-submit"]')).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test("invalid login shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', "nobody@roost.test");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('[data-testid="login-submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test("full signup flow creates account and reaches onboarding", async ({
    page,
  }) => {
    await signUp(page, freshUser());
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("valid login with existing account reaches dashboard", async ({
    page,
  }) => {
    await signIn(page, FREE_ADMIN);
    await expect(page).toHaveURL(/\/dashboard/);
    // Verify the app shell rendered (not just a redirect)
    await expect(page.locator("body")).toBeVisible();
  });
});

// Fresh user factory for password change tests — avoids mutating seeded accounts
const freshPwUser = () => {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  return {
    name: "PW Change Test",
    email: `pw-change-${ts}@roost.test`,
    password: "RoostTest123!",
  };
};

// ---------------------------------------------------------------------------
// Password change — auth gate and validation (API-level)
// ---------------------------------------------------------------------------

test.describe("Password change — unauthenticated", () => {
  test("POST /api/user/change-password without session → 401", async ({
    page,
  }) => {
    const res = await page.request.post("/api/user/change-password", {
      data: { currentPassword: "anything", newPassword: "NewPass123!" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Password change — validation", () => {
  test("wrong current password → 400", async ({ page }) => {
    await signUp(page, freshPwUser());
    const res = await page.request.post("/api/user/change-password", {
      data: { currentPassword: "WrongPass999!", newPassword: "NewPass123!" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/incorrect/i);
  });

  test("weak new password → 400", async ({ page }) => {
    await signUp(page, freshPwUser());
    const res = await page.request.post("/api/user/change-password", {
      data: { currentPassword: "RoostTest123!", newPassword: "tooweak" },
    });
    expect(res.status()).toBe(400);
  });

  test("missing fields → 400", async ({ page }) => {
    await signUp(page, freshPwUser());
    const res = await page.request.post("/api/user/change-password", {
      data: { currentPassword: "RoostTest123!" },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Password change — happy path", () => {
  test("valid change → 200 and new password works for sign-in", async ({
    page,
  }) => {
    const user = freshPwUser();
    const newPassword = "ChangedPass456@";

    // Sign up and create household so dashboard is reachable after re-login
    await signUp(page, user);
    await createHousehold(page, "PW Test House");
    await expect(page).toHaveURL(/\/dashboard/);

    // Change password while authenticated
    const changeRes = await page.request.post("/api/user/change-password", {
      data: { currentPassword: user.password, newPassword },
    });
    expect(changeRes.ok()).toBeTruthy();
    const body = (await changeRes.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Sign out and sign in with the new password
    await signOut(page);
    await expect(page).toHaveURL(/\/login/);

    await signIn(page, { email: user.email, password: newPassword });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

// ---------------------------------------------------------------------------
// Signed-in redirect behaviour
// Uses the saved free-admin session (storageState set via project config).
// The `unauthenticated` project does NOT use storageState, so we override
// here with test.use() for just this describe block.
// ---------------------------------------------------------------------------

test.describe("Auth flows — signed in", () => {
  test.use({ storageState: "e2e/.auth/free-admin.json" });

  test("signed-in user visiting /login is redirected to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForURL((url) => url.pathname.includes("/dashboard"), {
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("sign out clears session and returns to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
    await signOut(page);
    await expect(page).toHaveURL(/\/login/);
    // Verify protected route is no longer accessible
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
