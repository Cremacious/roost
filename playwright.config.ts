import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      timeout: 60000,
    },
    {
      // Auth, onboarding, and premium gating tested on mobile too
      // Navigation, chores, and grocery only run on desktop (signup flow is more reliable)
      name: "mobile",
      use: { ...devices["iPhone 14"] },
      testMatch: [
        "**/auth.spec.ts",
        "**/onboarding.spec.ts",
        "**/premium.spec.ts",
      ],
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
