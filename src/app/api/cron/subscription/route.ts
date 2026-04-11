import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { households } from "@/db/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find premium households whose expiry has passed
  const expired = await db
    .select({ id: households.id })
    .from(households)
    .where(
      and(
        eq(households.subscription_status, "premium"),
        isNotNull(households.premium_expires_at),
        lt(households.premium_expires_at, now)
      )
    );

  for (const h of expired) {
    await db
      .update(households)
      .set({
        subscription_status: "free",
        stripe_subscription_id: null,
        premium_expires_at: null,
        updated_at: now,
      })
      .where(eq(households.id, h.id));

    await logActivity({
      householdId: h.id,
      userId: "system",
      type: "subscription_expired",
      description: "Premium subscription expired",
    });
  }

  return Response.json({ expired: expired.length });
}
