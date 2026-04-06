import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, member_permissions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

const ALL_PERMISSIONS = [
  "expenses.view",
  "expenses.add",
  "chores.add",
  "chores.edit",
  "grocery.add",
  "grocery.create_list",
  "calendar.add",
  "calendar.edit",
  "tasks.add",
  "notes.add",
  "meals.plan",
  "meals.suggest",
];

const CHILD_LOCKED_PERMISSIONS = new Set(["expenses.view", "expenses.add", "grocery.create_list"]);

function defaultEnabled(permission: string, role: string): boolean {
  if (role === "child" && CHILD_LOCKED_PERMISSIONS.has(permission)) return false;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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
  if (membership.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [target] = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.id, id),
        eq(household_members.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const explicitRows = await db
    .select({ permission: member_permissions.permission, enabled: member_permissions.enabled })
    .from(member_permissions)
    .where(
      and(
        eq(member_permissions.user_id, target.user_id),
        eq(member_permissions.household_id, membership.householdId)
      )
    );

  const explicitMap = new Map(explicitRows.map((r) => [r.permission, r.enabled]));

  const permissions = ALL_PERMISSIONS.map((key) => ({
    permission: key,
    enabled: explicitMap.has(key) ? explicitMap.get(key)! : defaultEnabled(key, target.role),
  }));

  return Response.json({ permissions });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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
  if (membership.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { permission?: string; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.permission || body.enabled === undefined) {
    return Response.json({ error: "permission and enabled are required" }, { status: 400 });
  }

  if (!ALL_PERMISSIONS.includes(body.permission)) {
    return Response.json({ error: "Invalid permission" }, { status: 400 });
  }

  const [target] = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.id, id),
        eq(household_members.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  // Children: financial permissions cannot be enabled
  if (target.role === "child" && CHILD_LOCKED_PERMISSIONS.has(body.permission) && body.enabled) {
    return Response.json({ error: "This permission is locked for child accounts" }, { status: 400 });
  }

  await db
    .insert(member_permissions)
    .values({
      household_id: membership.householdId,
      user_id: target.user_id,
      permission: body.permission,
      enabled: body.enabled,
    })
    .onConflictDoUpdate({
      target: [
        member_permissions.household_id,
        member_permissions.user_id,
        member_permissions.permission,
      ],
      set: { enabled: body.enabled },
    });

  return Response.json({ permission: body.permission, enabled: body.enabled });
}
