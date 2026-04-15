import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  outputDir: ".playwright/test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: ".playwright/report", open: "never" }]],
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
  },
  projects: [
    // Desktop — authenticated as free admin
    {
      name: "free",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/free-admin.json",
      },
      testMatch: [
        "**/navigation.spec.ts",
        "**/chores.spec.ts",
        "**/grocery.spec.ts",
      ],
      timeout: 60000,
    },
    // Desktop — authenticated as premium admin
    {
      name: "premium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/premium-admin.json",
      },
      testMatch: ["**/premium.spec.ts"],
      timeout: 60000,
    },
    // Desktop — unauthenticated (signup, login, onboarding, child PIN, invite, email change)
    // Billing and permissions specs also live here — they manage their own auth via test.use().
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [
        "**/auth.spec.ts",
        "**/onboarding.spec.ts",
        "**/auth-child.spec.ts",
        "**/auth-invite.spec.ts",
        "**/auth-email-change.spec.ts",
        "**/billing.spec.ts",
        "**/permissions.spec.ts",
        "**/household.spec.ts",
        "**/cron.spec.ts",
      ],
      timeout: 60000,
    },
    // Mobile — unauthenticated
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },
      testMatch: ["**/auth.spec.ts", "**/onboarding.spec.ts"],
      timeout: 90000,
    },
    // Mobile — authenticated as premium admin
    {
      name: "mobile-premium",
      use: {
        ...devices["iPhone 14"],
        storageState: "e2e/.auth/premium-admin.json",
      },
      testMatch: ["**/premium.spec.ts"],
      timeout: 90000,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
