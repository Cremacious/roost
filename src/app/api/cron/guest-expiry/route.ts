import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { household_members, member_permissions, users } from "@/db/schema";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";

// ---- GET: Vercel cron — runs daily at 2am UTC --------------------------------
// Removes guest members whose expires_at has passed.

export async function GET(request: NextRequest): Promise<Response> {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all expired guest members
  const expired = await db
    .select({
      id: household_members.id,
      household_id: household_members.household_id,
      user_id: household_members.user_id,
      expires_at: household_members.expires_at,
    })
    .from(household_members)
    .where(
      and(
        eq(household_members.role, "guest"),
        isNotNull(household_members.expires_at),
        lt(household_members.expires_at, now)
      )
    );

  if (expired.length === 0) {
    return Response.json({ expired: 0, timestamp: now.toISOString() });
  }

  // Fetch names for activity log
  const userIds = [...new Set(expired.map((m) => m.user_id))];
  const nameRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(sql`${users.id} = ANY(${userIds})`);
  const nameMap = new Map(nameRows.map((u) => [u.id, u.name]));

  let processed = 0;
  for (const member of expired) {
    try {
      // Hard-delete the membership (guests aren't permanent household members)
      await db.delete(household_members).where(eq(household_members.id, member.id));

      // Clean up their permissions
      await db
        .delete(member_permissions)
        .where(
          and(
            eq(member_permissions.household_id, member.household_id),
            eq(member_permissions.user_id, member.user_id)
          )
        );

      // Log activity
      const name = nameMap.get(member.user_id) ?? "A guest";
      await logActivity({
        householdId: member.household_id,
        userId: member.user_id,
        type: "guest_expired",
        description: `${name}'s guest access has ended`,
      });

      processed++;
    } catch (err) {
      console.error("[cron/guest-expiry] Failed to process member:", member.id, err);
    }
  }

  return Response.json({ expired: processed, timestamp: now.toISOString() });
}
