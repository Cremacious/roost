import { cleanupPlaywrightTestData } from "./helpers/cleanup";

async function globalTeardown() {
  console.log("\nCleaning Playwright-created test data...");
  await cleanupPlaywrightTestData();
}

export default globalTeardown;
