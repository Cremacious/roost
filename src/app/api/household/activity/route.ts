import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_activity, users } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  const { householdId } = membership;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  const [totalResult] = await db
    .select({ total: count() })
    .from(household_activity)
    .where(eq(household_activity.household_id, householdId));

  const total = totalResult?.total ?? 0;

  const rawActivity = await db
    .select({
      id: household_activity.id,
      type: household_activity.type,
      description: household_activity.description,
      entity_id: household_activity.entity_id,
      entity_type: household_activity.entity_type,
      created_at: household_activity.created_at,
      user_id: household_activity.user_id,
      user_name: users.name,
      user_avatar: users.avatar_color,
    })
    .from(household_activity)
    .innerJoin(users, eq(household_activity.user_id, users.id))
    .where(eq(household_activity.household_id, householdId))
    .orderBy(desc(household_activity.created_at))
    .limit(limit)
    .offset(offset);

  return Response.json({
    activity: rawActivity,
    total,
    hasMore: offset + rawActivity.length < total,
  });
}
