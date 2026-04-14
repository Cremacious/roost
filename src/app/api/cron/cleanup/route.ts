import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cleanupExpiredRateLimits } from "@/lib/security/rateLimit";
import { log } from "@/lib/utils/logger";

const HOUSEHOLD_ACTIVITY_RETENTION_DAYS = 180;
const SENT_NOTIFICATIONS_RETENTION_DAYS = 30;
const REMINDER_RECEIPTS_RETENTION_DAYS = 30;

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  log.info("cron/cleanup.start", { at: new Date().toISOString() });

  const [expiredRateLimits, oldActivity, oldNotifications, oldReminderReceipts] =
    await Promise.all([
      cleanupExpiredRateLimits(),
      db.execute(sql`
        DELETE FROM "household_activity"
        WHERE "created_at" < NOW() - INTERVAL '${sql.raw(`${HOUSEHOLD_ACTIVITY_RETENTION_DAYS} days`)}'
        RETURNING "id"
      `),
      db.execute(sql`
        DELETE FROM "notification_queue"
        WHERE "sent" = true
          AND "sent_at" IS NOT NULL
          AND "sent_at" < NOW() - INTERVAL '${sql.raw(`${SENT_NOTIFICATIONS_RETENTION_DAYS} days`)}'
        RETURNING "id"
      `),
      db.execute(sql`
        DELETE FROM "reminder_receipts" rr
        USING "reminders" r
        WHERE rr."reminder_id" = r."id"
          AND (
            r."deleted_at" < NOW() - INTERVAL '${sql.raw(`${REMINDER_RECEIPTS_RETENTION_DAYS} days`)}'
            OR (
              r."completed" = true
              AND r."completed_at" IS NOT NULL
              AND r."completed_at" < NOW() - INTERVAL '${sql.raw(`${REMINDER_RECEIPTS_RETENTION_DAYS} days`)}'
            )
          )
        RETURNING rr."id"
      `),
    ]);

  const summary = {
    expiredRateLimits,
    deletedActivity: oldActivity.rows.length,
    deletedNotifications: oldNotifications.rows.length,
    deletedReminderReceipts: oldReminderReceipts.rows.length,
    durationMs: Date.now() - startedAt,
  };

  log.info("cron/cleanup.done", summary);
  return Response.json(summary);
}
