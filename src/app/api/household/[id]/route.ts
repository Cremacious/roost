import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, householdMembers, user } from "@/db/schema";
import { deleteAllHouseholdData } from "@/lib/utils/deleteHouseholdData";
import { and, eq, isNull } from "drizzle-orm";

// ---- PATCH: rename household -------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  let body: { name?: string; statsVisibility?: Record<string, boolean>; mealApprovalMode?: 'admin_only' | 'open_vote'; joinApprovalRequired?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Build update payload — at least one field must be present
  const updates: { name?: string; stats_visibility?: string; meal_approval_mode?: 'admin_only' | 'open_vote'; join_approval_required?: boolean; updated_at: Date } = {
    updated_at: new Date(),
  };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.statsVisibility !== undefined) {
    updates.stats_visibility = JSON.stringify(body.statsVisibility);
  }

  if (body.mealApprovalMode !== undefined) {
    if (body.mealApprovalMode !== 'admin_only' && body.mealApprovalMode !== 'open_vote') {
      return Response.json({ error: "Invalid mealApprovalMode" }, { status: 400 });
    }
    updates.meal_approval_mode = body.mealApprovalMode;
  }

  if (body.joinApprovalRequired !== undefined) {
    updates.join_approval_required = body.joinApprovalRequired;
  }

  if (!updates.name && !updates.stats_visibility && !updates.meal_approval_mode && updates.join_approval_required === undefined) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(households)
    .set(updates)
    .where(eq(households.id, id))
    .returning();

  return Response.json({ household: updated });
}

// ---- DELETE: delete household ------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  // Capture members before removal so anyone left without a household can be
  // sent back through onboarding.
  const memberRows = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, id));
  const affectedUserIds = [...new Set(memberRows.map((m) => m.userId))];

  await deleteAllHouseholdData(id);

  // Remove all members
  await db.delete(householdMembers).where(eq(householdMembers.householdId, id));

  // Soft delete household
  await db
    .update(households)
    .set({ deleted_at: new Date(), updated_at: new Date() })
    .where(eq(households.id, id));

  // Reset onboarding for any member now left with no active household. The proxy
  // reads onboardingCompleted from the session (better-auth `user` table); if it
  // stays true after their only household is gone, they get bounced away from
  // /onboarding and stranded. Users still in another household (premium
  // multi-household) keep the flag so they are not needlessly re-onboarded.
  for (const userId of affectedUserIds) {
    const [remaining] = await db
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, userId),
          isNull(householdMembers.deletedAt),
          isNull(households.deleted_at),
        ),
      )
      .limit(1);
    if (!remaining) {
      await db
        .update(user)
        .set({ onboardingCompleted: false, updatedAt: new Date() })
        .where(eq(user.id, userId));
    }
  }

  return Response.json({ success: true });
}
