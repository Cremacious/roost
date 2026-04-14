import { log } from "@/lib/utils/logger";

const LOCAL_APP_URL = "http://localhost:3000";

const PRODUCTION_REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_SESSION_SECRET",
  "CRON_SECRET",
] as const;

let validated = false;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("placeholder") ||
    normalized.includes("your_") ||
    normalized.endsWith("_...") ||
    normalized === "postgresql://..." ||
    normalized === "sk_test_..." ||
    normalized === "whsec_..." ||
    normalized === "pk_test_..." ||
    normalized === "price_..."
  );
}

function ensureValidUrl(name: string, value: string): string {
  try {
    const parsed = new URL(value);
    return parsed.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`[env] ${name} must be a valid absolute URL`);
  }
}

export function getAppUrl(): string {
  const configured =
    readEnv("NEXT_PUBLIC_APP_URL") ??
    readEnv("BETTER_AUTH_URL") ??
    (!isProduction() ? LOCAL_APP_URL : undefined);

  if (!configured) {
    throw new Error("[env] NEXT_PUBLIC_APP_URL is required in production");
  }

  return ensureValidUrl("NEXT_PUBLIC_APP_URL", configured);
}

export function getMetadataBaseUrl(): URL {
  return new URL(getAppUrl());
}

export function getDatabaseUrl(): string {
  const value = readEnv("DATABASE_URL");
  if (!value) throw new Error("[env] DATABASE_URL is not configured");
  return value;
}

export function getAdminSessionSecret(): string {
  const value = readEnv("ADMIN_SESSION_SECRET");
  if (!value) throw new Error("[env] ADMIN_SESSION_SECRET is not configured");
  return value;
}

export function getAdminEmail(): string | undefined {
  return readEnv("ADMIN_EMAIL");
}

export function getAdminPassword(): string | undefined {
  return readEnv("ADMIN_PASSWORD");
}

export function getCronSecret(): string | undefined {
  return readEnv("CRON_SECRET");
}

export function isStripeConfigured(): boolean {
  return (
    !isPlaceholderValue(readEnv("STRIPE_SECRET_KEY")) &&
    !isPlaceholderValue(readEnv("STRIPE_PRICE_ID"))
  );
}

export function isStripeWebhookConfigured(): boolean {
  return isStripeConfigured() && !isPlaceholderValue(readEnv("STRIPE_WEBHOOK_SECRET"));
}

export function getStripeSecretKey(): string {
  const value = readEnv("STRIPE_SECRET_KEY");
  if (isPlaceholderValue(value)) {
    throw new Error("[env] STRIPE_SECRET_KEY is not configured");
  }
  return value!;
}

export function getStripePriceId(): string {
  const value = readEnv("STRIPE_PRICE_ID");
  if (isPlaceholderValue(value)) {
    throw new Error("[env] STRIPE_PRICE_ID is not configured");
  }
  return value!;
}

export function getStripeWebhookSecret(): string {
  const value = readEnv("STRIPE_WEBHOOK_SECRET");
  if (isPlaceholderValue(value)) {
    throw new Error("[env] STRIPE_WEBHOOK_SECRET is not configured");
  }
  return value!;
}

export function isAzureReceiptScanningConfigured(): boolean {
  return (
    !isPlaceholderValue(readEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")) &&
    !isPlaceholderValue(readEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY"))
  );
}

export function getAzureDocumentIntelligenceConfig(): {
  endpoint: string;
  key: string;
} {
  const endpoint = readEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
  const key = readEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY");

  if (isPlaceholderValue(endpoint) || isPlaceholderValue(key)) {
    throw new Error("[env] Azure Document Intelligence is not configured");
  }

  return {
    endpoint: ensureValidUrl("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT", endpoint!),
    key: key!,
  };
}

export function validateServerEnv(): void {
  if (validated) return;
  validated = true;

  const missing = PRODUCTION_REQUIRED_ENV_VARS.filter(
    (name) => !readEnv(name)
  );

  const appUrl = getAppUrl();
  const betterAuthUrl = readEnv("BETTER_AUTH_URL");
  const billingConfigured = isStripeConfigured();
  const stripeWebhookConfigured = isStripeWebhookConfigured();
  const receiptScanningConfigured = isAzureReceiptScanningConfigured();
  const adminIpRestricted = Boolean(readEnv("ADMIN_ALLOWED_IPS"));

  if (isProduction() && missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (missing.length > 0) {
    log.warn("startup.env_missing", { vars: missing.join(",") });
  }

  if (
    betterAuthUrl &&
    ensureValidUrl("BETTER_AUTH_URL", betterAuthUrl) !== appUrl
  ) {
    log.warn("startup.env_url_mismatch", {
      nextPublicAppUrl: appUrl,
      betterAuthUrl: ensureValidUrl("BETTER_AUTH_URL", betterAuthUrl),
    });
  }

  log.info("startup.env", {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    appUrl,
    billingConfigured,
    stripeWebhookConfigured,
    receiptScanningConfigured,
    adminIpRestricted,
  });
}
