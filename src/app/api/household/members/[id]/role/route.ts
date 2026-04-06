import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, member_permissions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

const CHILD_LOCKED_PERMISSIONS = ["expenses.view", "expenses.add", "grocery.create_list"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params; // household_members.id

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

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.role || !["admin", "member", "child"].includes(body.role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
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

  if (target.user_id === session.user.id) {
    return Response.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const [updated] = await db
    .update(household_members)
    .set({ role: body.role })
    .where(eq(household_members.id, id))
    .returning();

  // When changing to child: disable financial permissions
  if (body.role === "child") {
    for (const permission of CHILD_LOCKED_PERMISSIONS) {
      await db
        .insert(member_permissions)
        .values({
          household_id: membership.householdId,
          user_id: target.user_id,
          permission,
          enabled: false,
        })
        .onConflictDoUpdate({
          target: [
            member_permissions.household_id,
            member_permissions.user_id,
            member_permissions.permission,
          ],
          set: { enabled: false },
        });
    }
  }

  return Response.json({ member: updated });
}
