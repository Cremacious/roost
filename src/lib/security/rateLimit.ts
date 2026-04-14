import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

interface ConsumeRateLimitOptions {
  key: string;
  limit: number;
  scope: string;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterSec: number;
}

let ensureRateLimitTablePromise: Promise<void> | null = null;
let lastRateLimitCleanupAt = 0;

async function ensureRateLimitTable(): Promise<void> {
  if (!ensureRateLimitTablePromise) {
    ensureRateLimitTablePromise = db.execute(sql`
      CREATE TABLE IF NOT EXISTS "request_rate_limits" (
        "scope" text NOT NULL,
        "key" text NOT NULL,
        "count" integer NOT NULL DEFAULT 1,
        "reset_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "request_rate_limits_scope_key_pk" PRIMARY KEY("scope", "key")
      )
    `).then(() => undefined);
  }

  await ensureRateLimitTablePromise;
}

export async function consumeRateLimit({
  key,
  limit,
  scope,
  windowMs,
}: ConsumeRateLimitOptions): Promise<RateLimitResult> {
  await ensureRateLimitTable();
  void maybeCleanupExpiredRateLimits();

  const result = await db.execute(sql`
    INSERT INTO "request_rate_limits" ("scope", "key", "count", "reset_at", "created_at", "updated_at")
    VALUES (
      ${scope},
      ${key},
      1,
      NOW() + (${String(windowMs)} || ' milliseconds')::interval,
      NOW(),
      NOW()
    )
    ON CONFLICT ("scope", "key")
    DO UPDATE SET
      "count" = CASE
        WHEN "request_rate_limits"."reset_at" <= NOW() THEN 1
        ELSE "request_rate_limits"."count" + 1
      END,
      "reset_at" = CASE
        WHEN "request_rate_limits"."reset_at" <= NOW() THEN NOW() + (${String(windowMs)} || ' milliseconds')::interval
        ELSE "request_rate_limits"."reset_at"
      END,
      "updated_at" = NOW()
    RETURNING
      "count",
      GREATEST(0, CEIL(EXTRACT(EPOCH FROM ("reset_at" - NOW()))))::int AS "retry_after_sec"
  `);

  const row = result.rows[0] as { count: number | string; retry_after_sec: number | string } | undefined;
  const currentCount = Number(row?.count ?? 0);
  const retryAfterSec = Number(row?.retry_after_sec ?? 0);

  return {
    allowed: currentCount > 0 && currentCount <= limit,
    currentCount,
    retryAfterSec,
  };
}

export async function resetRateLimit(scope: string, key: string): Promise<void> {
  await ensureRateLimitTable();

  await db.execute(sql`
    DELETE FROM "request_rate_limits"
    WHERE "scope" = ${scope} AND "key" = ${key}
  `);
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  await ensureRateLimitTable();

  const result = await db.execute(sql`
    DELETE FROM "request_rate_limits"
    WHERE "reset_at" < NOW()
    RETURNING "scope"
  `);

  return result.rows.length;
}

async function maybeCleanupExpiredRateLimits(): Promise<void> {
  const now = Date.now();
  if (now - lastRateLimitCleanupAt < 10 * 60_000) return;
  lastRateLimitCleanupAt = now;

  try {
    await cleanupExpiredRateLimits();
  } catch {
    // Cleanup is best-effort; rate limiting should keep working even if prune fails.
  }
}
