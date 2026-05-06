import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { householdMembers, households, memberPermissions } from "@/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Most recently joined household membership
  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .orderBy(desc(householdMembers.createdAt))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "No household" }, { status: 404 });
  }

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      code: households.code,
      subscription_status: households.subscription_status,
      stripe_customer_id: households.stripe_customer_id,
      stripe_subscription_id: households.stripe_subscription_id,
      stripe_price_id: households.stripe_price_id,
      premium_expires_at: households.premium_expires_at,
      stats_visibility: households.stats_visibility,
      created_by: households.created_by,
    })
    .from(households)
    .where(and(eq(households.id, membership.householdId), isNull(households.deletedAt)))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  // Get permissions from the boolean columns
  const [perms] = await db
    .select()
    .from(memberPermissions)
    .where(
      and(
        eq(memberPermissions.userId, userId),
        eq(memberPermissions.householdId, membership.householdId),
      )
    )
    .limit(1);

  const permissions: string[] = [];
  if (perms) {
    if (perms.expensesView) permissions.push("expenses.view");
    if (perms.expensesAdd) permissions.push("expenses.add");
    if (perms.choresAdd) permissions.push("chores.add");
    if (perms.choresEdit) permissions.push("chores.edit");
    if (perms.groceryAdd) permissions.push("grocery.add");
    if (perms.groceryCreateList) permissions.push("grocery.create_list");
    if (perms.calendarAdd) permissions.push("calendar.add");
    if (perms.calendarEdit) permissions.push("calendar.edit");
    if (perms.tasksAdd) permissions.push("tasks.add");
    if (perms.notesAdd) permissions.push("notes.add");
    if (perms.mealsPlan) permissions.push("meals.plan");
    if (perms.mealsSuggest) permissions.push("meals.suggest");
  }

  return Response.json({ household, role: membership.role, permissions });
}
