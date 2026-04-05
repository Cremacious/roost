import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  // Find user's first household membership
  const [membership] = await db
    .select({ householdId: household_members.household_id })
    .from(household_members)
    .where(eq(household_members.user_id, session.user.id))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const members = await db
    .select({
      id: household_members.id,
      userId: household_members.user_id,
      role: household_members.role,
      joinedAt: household_members.joined_at,
      name: users.name,
      avatarColor: users.avatar_color,
    })
    .from(household_members)
    .innerJoin(users, eq(household_members.user_id, users.id))
    .where(eq(household_members.household_id, household.id));

  return Response.json({
    household: {
      id: household.id,
      name: household.name,
      code: household.code,
      subscriptionStatus: household.subscription_status,
    },
    members,
  });
}
