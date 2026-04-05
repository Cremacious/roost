import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_activity, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
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
    .limit(20);

  return Response.json({ activity: rawActivity });
}
