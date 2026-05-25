import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { householdMembers, households, memberPermissions, users } from "@/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";

const DEFAULT_PERMISSIONS = {
  admin: {
    expensesView: true,
    expensesAdd: true,
    choresAdd: true,
    choresEdit: true,
    groceryAdd: true,
    groceryCreateList: true,
    calendarAdd: true,
    calendarEdit: true,
    tasksAdd: true,
    notesAdd: true,
    mealsPlan: true,
    mealsSuggest: true,
  },
  member: {
    expensesView: true,
    expensesAdd: true,
    choresAdd: false,
    choresEdit: false,
    groceryAdd: true,
    groceryCreateList: false,
    calendarAdd: true,
    calendarEdit: false,
    tasksAdd: true,
    notesAdd: true,
    mealsPlan: true,
    mealsSuggest: true,
  },
  guest: {
    expensesView: true,
    expensesAdd: true,
    choresAdd: false,
    choresEdit: false,
    groceryAdd: true,
    groceryCreateList: false,
    calendarAdd: true,
    calendarEdit: false,
    tasksAdd: true,
    notesAdd: true,
    mealsPlan: true,
    mealsSuggest: true,
  },
  child: {
    expensesView: false,
    expensesAdd: false,
    choresAdd: false,
    choresEdit: false,
    groceryAdd: true,
    groceryCreateList: false,
    calendarAdd: false,
    calendarEdit: false,
    tasksAdd: false,
    notesAdd: false,
    mealsPlan: false,
    mealsSuggest: true,
  },
} as const;

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
      id: householdMembers.id,
      userId: householdMembers.userId,
      role: householdMembers.role,
      joinedAt: householdMembers.createdAt,
      expiresAt: householdMembers.expiresAt,
      upgradeAllowed: householdMembers.upgradeAllowed,
      name: users.name,
      email: users.email,
      avatarColor: users.avatarColor,
      permissions: {
        expensesView: memberPermissions.expensesView,
        expensesAdd: memberPermissions.expensesAdd,
        choresAdd: memberPermissions.choresAdd,
        choresEdit: memberPermissions.choresEdit,
        groceryAdd: memberPermissions.groceryAdd,
        groceryCreateList: memberPermissions.groceryCreateList,
        calendarAdd: memberPermissions.calendarAdd,
        calendarEdit: memberPermissions.calendarEdit,
        tasksAdd: memberPermissions.tasksAdd,
        notesAdd: memberPermissions.notesAdd,
        mealsPlan: memberPermissions.mealsPlan,
        mealsSuggest: memberPermissions.mealsSuggest,
      },
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .leftJoin(
      memberPermissions,
      and(
        eq(memberPermissions.householdId, householdMembers.householdId),
        eq(memberPermissions.userId, householdMembers.userId),
      )
    )
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
      id: m.id,
      userId: m.userId,
      name: m.name,
      email: m.email ?? null,
      avatarColor: m.avatarColor,
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      expiresAt: m.expiresAt?.toISOString() ?? null,
      upgradeAllowed: m.upgradeAllowed,
      permissions: {
        ...(DEFAULT_PERMISSIONS[m.role] ?? DEFAULT_PERMISSIONS.member),
        ...(m.permissions ?? {}),
      },
    })),
  });
}
