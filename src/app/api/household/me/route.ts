import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households, member_permissions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  // Get the most recently joined household for this user
  const [membership] = await db
    .select({
      householdId: household_members.household_id,
      role: household_members.role,
      joinedAt: household_members.joined_at,
    })
    .from(household_members)
    .where(eq(household_members.user_id, session.user.id))
    .orderBy(desc(household_members.joined_at))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      code: households.code,
      subscription_status: households.subscription_status,
      created_by: households.created_by,
    })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const permissionRows = await db
    .select({ permission: member_permissions.permission })
    .from(member_permissions)
    .where(eq(member_permissions.user_id, session.user.id));

  const permissions = permissionRows.map((p) => p.permission);

  return Response.json({
    household,
    role: membership.role,
    permissions,
  });
}
