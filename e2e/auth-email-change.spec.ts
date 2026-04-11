/**
 * Email change + re-login test.
 *
 * Verifies the fix from roadmap item 1.1:
 * PATCH /api/user/profile now updates BOTH the better-auth "user" table AND
 * the app "users" table in a single transaction. Before the fix, only the app
 * table was updated — the user could not log in with the new email.
 *
 * Test uses a fresh signup each run so the seed accounts are never mutated.
 * The old email becomes unreachable after the change; we confirm this too.
 */

import { test, expect } from "@playwright/test";
import { signUp, createHousehold, signIn, signOut } from "./helpers/auth";

const freshUser = () => {
  const ts = Date.now();
  return {
    name: "Email Change Test",
    email: `email-change-${ts}@roost.test`,
    password: "RoostTest123!",
    newEmail: `email-changed-${ts}@roost.test`,
  };
};

test.describe("Email change and re-login", () => {
  test("user can log in with new email after PATCH /api/user/profile", async ({
    page,
  }) => {
    const user = freshUser();

    // 1. Sign up and create a household so the user has a full session
    await signUp(page, {
      name: user.name,
      email: user.email,
      password: user.password,
    });
    await createHousehold(page, `${user.name}'s House`);
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Change email via API — page.request shares the session cookie
    const res = await page.request.patch("/api/user/profile", {
      data: { email: user.newEmail },
    });
    expect(res.ok()).toBeTruthy();

    // 3. Sign out
    await signOut(page);
    await expect(page).toHaveURL(/\/login/);

    // 4. Sign in with the NEW email — this verifies the auth "user" table was updated
    await signIn(page, { email: user.newEmail, password: user.password });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("old email no longer works after email change", async ({ page }) => {
    const user = freshUser();

    // Sign up and change email
    await signUp(page, {
      name: user.name,
      email: user.email,
      password: user.password,
    });
    await createHousehold(page, `${user.name}'s House`);

    await page.request.patch("/api/user/profile", {
      data: { email: user.newEmail },
    });

    await signOut(page);
    await expect(page).toHaveURL(/\/login/);

    // Attempt login with OLD email — should fail (stay on /login)
    await page.goto("/login");
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });
});
