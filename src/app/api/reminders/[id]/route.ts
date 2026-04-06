import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reminders } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { calcNextRemindAt } from "@/app/api/reminders/route";

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
  const { householdId, role } = membership;

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.household_id, householdId), isNull(reminders.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    note?: string | null;
    remind_at?: string;
    frequency?: string;
    custom_days?: number[] | null;
    notify_type?: string;
    notify_user_ids?: string[] | null;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[PATCH /api/reminders/[id]] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const newRemindAt = body.remind_at ? new Date(body.remind_at) : existing.remind_at;
  const newFrequency = body.frequency ?? existing.frequency;
  const newCustomDays = body.custom_days !== undefined
    ? (body.custom_days ?? null)
    : (existing.custom_days ? (JSON.parse(existing.custom_days) as number[]) : null);

  const nextRemindAt = calcNextRemindAt(newFrequency, newCustomDays, newRemindAt) ?? newRemindAt;

  const [updated] = await db
    .update(reminders)
    .set({
      title: body.title?.trim() ?? existing.title,
      note: body.note !== undefined ? (body.note?.trim() || null) : existing.note,
      remind_at: newRemindAt,
      frequency: newFrequency,
      custom_days: body.custom_days !== undefined
        ? (body.custom_days ? JSON.stringify(body.custom_days) : null)
        : existing.custom_days,
      notify_type: body.notify_type ?? existing.notify_type,
      notify_user_ids: body.notify_user_ids !== undefined
        ? (body.notify_user_ids ? JSON.stringify(body.notify_user_ids) : null)
        : existing.notify_user_ids,
      next_remind_at: nextRemindAt,
      updated_at: new Date(),
    })
    .where(eq(reminders.id, id))
    .returning();

  return Response.json({ reminder: updated });
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
  const { householdId, role } = membership;

  const [existing] = await db
    .select({ id: reminders.id, created_by: reminders.created_by })
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.household_id, householdId), isNull(reminders.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.update(reminders).set({ deleted_at: new Date() }).where(eq(reminders.id, id));

  return Response.json({ ok: true });
}
