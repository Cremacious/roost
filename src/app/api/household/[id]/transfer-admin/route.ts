import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { householdMembers } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";

// POST: admin only — hand admin control to another member.
// The caller is demoted to a regular member; the target is promoted to admin.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  let caller: { userId: string };
  try {
    caller = await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  const body = await request.json().catch(() => null);
  const newAdminUserId = body?.newAdminUserId;
  if (!newAdminUserId || typeof newAdminUserId !== "string") {
    return Response.json({ error: "newAdminUserId is required" }, { status: 400 });
  }

  if (newAdminUserId === caller.userId) {
    return Response.json({ error: "You are already the admin" }, { status: 400 });
  }

  // Target must be an active, non-child member of this household.
  const [target] = await db
    .select({ id: householdMembers.id, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, id),
        eq(householdMembers.userId, newAdminUserId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1);

  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.role === "child") {
    return Response.json({ error: "A child account cannot become admin" }, { status: 400 });
  }

  // Promote target, demote caller. Neon HTTP has no interactive transactions,
  // so promote first (guarantees the household always has at least one admin
  // even if the second write fails).
  await db
    .update(householdMembers)
    .set({ role: "admin" })
    .where(
      and(
        eq(householdMembers.householdId, id),
        eq(householdMembers.userId, newAdminUserId),
      )
    );

  await db
    .update(householdMembers)
    .set({ role: "member" })
    .where(
      and(
        eq(householdMembers.householdId, id),
        eq(householdMembers.userId, caller.userId),
      )
    );

  await logActivity({
    householdId: id,
    userId: caller.userId,
    type: "admin_transferred",
    entityId: newAdminUserId,
    entityType: "member",
    description: "Admin control transferred",
  });

  return Response.json({ ok: true });
}
