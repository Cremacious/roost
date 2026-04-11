import { chromium, FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");
const FREE_ADMIN_STATE = path.join(AUTH_DIR, "free-admin.json");
const PREMIUM_ADMIN_STATE = path.join(AUTH_DIR, "premium-admin.json");
const MEMBER_STATE = path.join(AUTH_DIR, "member.json");
const CHILD_STATE = path.join(AUTH_DIR, "child.json");

const BASE = "http://localhost:3000";

async function globalSetup(_config: FullConfig) {
  // Ensure the .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Run the seed script to create fixed test accounts in the DB.
  // --env-file loads .env.local so DATABASE_URL is available to the script.
  console.log("\nSeeding test accounts...");
  execSync("npx tsx --env-file=.env.local src/db/seed.ts", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  // Log in as each fixed account and save the session cookie to a file.
  // Tests load these files via storageState to skip the login step entirely.
  const browser = await chromium.launch();

  // --- Free admin auth state ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', "admin.free@roost.test");
    await page.fill('input[type="password"]', "RoostTest123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await ctx.storageState({ path: FREE_ADMIN_STATE });
    await ctx.close();
    console.log("  ✓ Saved auth state: free-admin");
  }

  // --- Premium admin auth state ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', "admin.premium@roost.test");
    await page.fill('input[type="password"]', "RoostTest123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await ctx.storageState({ path: PREMIUM_ADMIN_STATE });
    await ctx.close();
    console.log("  ✓ Saved auth state: premium-admin");
  }

  // --- Member auth state ---
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', "member@roost.test");
    await page.fill('input[type="password"]', "RoostTest123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await ctx.storageState({ path: MEMBER_STATE });
    await ctx.close();
    console.log("  ✓ Saved auth state: member");
  }

  // --- Child auth state ---
  // Child accounts use PIN login, not email/password. We call the child-login API
  // directly: it sets a signed session cookie via Set-Cookie, which is captured into
  // the context's cookie jar by page.request, then saved via storageState.
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Step 1: discover the child's ID from the household code
    const childrenRes = await page.request.get(
      `${BASE}/api/auth/child-login?householdCode=RSTFRE`
    );
    const { children } = await childrenRes.json() as { children: { id: string; name: string }[] };
    const child = children.find((c) => c.name === "Test Child");
    if (!child) {
      console.error("  ✗ Test Child not found in RSTFRE household — run npm run db:seed first");
    } else {
      // Step 2: authenticate as the child — response sets the session cookie
      await page.request.post(`${BASE}/api/auth/child-login`, {
        data: { householdCode: "RSTFRE", childId: child.id, pin: "1234" },
      });
      await ctx.storageState({ path: CHILD_STATE });
      console.log("  ✓ Saved auth state: child");
    }

    await ctx.close();
  }

  await browser.close();
  console.log();
}

export default globalSetup;
