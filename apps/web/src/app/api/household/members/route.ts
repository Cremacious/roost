import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { householdMembers, households, users } from "@/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

export async function GET(_req: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Find the user's most recent active household membership
  const [membership] = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .orderBy(desc(householdMembers.createdAt))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "No household" }, { status: 404 });
  }

  const [household] = await db
    .select({ id: households.id, name: households.name, code: households.code })
    .from(households)
    .where(and(eq(households.id, membership.householdId), isNull(households.deleted_at)))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const members = await db
    .select({
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.createdAt,
      name: users.name,
      avatarColor: users.avatarColor,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(
      and(
        eq(householdMembers.householdId, membership.householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .orderBy(householdMembers.createdAt);

  return Response.json({
    household: {
      id: household.id,
      name: household.name,
      code: household.code,
    },
    role: membership.role,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.name,
      avatarColor: m.avatarColor,
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? null,
    })),
  });
}
