import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { chores, household_members } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold, calcNextDueAt } from "../route";

// ---- PATCH ------------------------------------------------------------------

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
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify chore belongs to this household
  const [existing] = await db
    .select()
    .from(chores)
    .where(
      and(
        eq(chores.id, id),
        eq(chores.household_id, membership.householdId),
        isNull(chores.deleted_at)
      )
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Chore not found" }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string;
    assigned_to?: string | null;
    frequency?: string;
    custom_days?: number[] | null;
    category_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const newFrequency = body.frequency ?? existing.frequency;
  const newCustomDays =
    body.custom_days !== undefined
      ? body.custom_days
      : existing.custom_days
      ? (JSON.parse(existing.custom_days) as number[])
      : null;

  const frequencyChanged =
    body.frequency !== undefined || body.custom_days !== undefined;

  const next_due_at = frequencyChanged
    ? calcNextDueAt(newFrequency, newCustomDays)
    : existing.next_due_at ?? undefined;

  const [updated] = await db
    .update(chores)
    .set({
      title: body.title?.trim() ?? existing.title,
      description:
        body.description !== undefined
          ? body.description?.trim() || null
          : existing.description,
      assigned_to:
        body.assigned_to !== undefined ? body.assigned_to : existing.assigned_to,
      frequency: newFrequency,
      custom_days: newCustomDays ? JSON.stringify(newCustomDays) : null,
      category_id:
        body.category_id !== undefined ? body.category_id : existing.category_id,
      next_due_at,
      updated_at: new Date(),
    })
    .where(eq(chores.id, id))
    .returning();

  return Response.json({ chore: updated });
}

// ---- DELETE -----------------------------------------------------------------

export async function DELETE(
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
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const [existing] = await db
    .select({ id: chores.id })
    .from(chores)
    .where(
      and(
        eq(chores.id, id),
        eq(chores.household_id, membership.householdId),
        isNull(chores.deleted_at)
      )
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Chore not found" }, { status: 404 });
  }

  await db
    .update(chores)
    .set({ deleted_at: new Date() })
    .where(eq(chores.id, id));

  return Response.json({ ok: true });
}
