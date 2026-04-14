describe("env helpers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("falls back to localhost for app url outside production", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.BETTER_AUTH_URL;
    process.env.NODE_ENV = "test";

    const { getAppUrl } = await import("@/lib/env");

    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("treats placeholder stripe values as unconfigured", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_ci_placeholder";
    process.env.STRIPE_PRICE_ID = "price_ci_placeholder";

    const { isStripeConfigured } = await import("@/lib/env");

    expect(isStripeConfigured()).toBe(false);
  });

  it("detects configured receipt scanning credentials", async () => {
    process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT =
      "https://roost.cognitiveservices.azure.com/";
    process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY = "real-looking-key";

    const { isAzureReceiptScanningConfigured } = await import("@/lib/env");

    expect(isAzureReceiptScanningConfigured()).toBe(true);
  });
});
