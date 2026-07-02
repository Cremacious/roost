import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, householdMembers } from "@/db/schema";
import { deleteAllHouseholdData } from "@/lib/utils/deleteHouseholdData";
import { eq } from "drizzle-orm";

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

  await deleteAllHouseholdData(id);

  // Remove all members
  await db.delete(householdMembers).where(eq(householdMembers.householdId, id));

  // Soft delete household
  await db
    .update(households)
    .set({ deleted_at: new Date(), updated_at: new Date() })
    .where(eq(households.id, id));

  return Response.json({ success: true });
}
