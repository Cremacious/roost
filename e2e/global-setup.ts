import { chromium, FullConfig } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = path.join(__dirname, ".auth");
const FREE_ADMIN_STATE = path.join(AUTH_DIR, "free-admin.json");
const PREMIUM_ADMIN_STATE = path.join(AUTH_DIR, "premium-admin.json");

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
    await page.goto("http://localhost:3000/login");
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
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin.premium@roost.test");
    await page.fill('input[type="password"]', "RoostTest123!");
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL("**/dashboard", { timeout: 30000 });
    await ctx.storageState({ path: PREMIUM_ADMIN_STATE });
    await ctx.close();
    console.log("  ✓ Saved auth state: premium-admin");
  }

  await browser.close();
  console.log();
}

export default globalSetup;
