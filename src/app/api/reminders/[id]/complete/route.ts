import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reminders, reminder_receipts } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { calcNextRemindAt } from "@/app/api/reminders/route";

// ---- POST: mark complete (or advance recurring) ------------------------------

export async function POST(
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
  const { householdId } = membership;

  const [existing] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.household_id, householdId), isNull(reminders.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

  const now = new Date();
  let updated;

  if (existing.frequency === "once") {
    // Mark as permanently completed
    [updated] = await db
      .update(reminders)
      .set({
        completed: true,
        completed_at: now,
        completed_by: session.user.id,
        updated_at: now,
      })
      .where(eq(reminders.id, id))
      .returning();
  } else {
    // Recurring: advance to next occurrence, don't mark completed
    const customDays = existing.custom_days ? (JSON.parse(existing.custom_days) as number[]) : null;
    const nextRemindAt = calcNextRemindAt(existing.frequency, customDays, existing.next_remind_at ?? now);

    [updated] = await db
      .update(reminders)
      .set({
        last_sent_at: now,
        next_remind_at: nextRemindAt,
        updated_at: now,
      })
      .where(eq(reminders.id, id))
      .returning();
  }

  // Mark receipt as seen for this user
  await db
    .update(reminder_receipts)
    .set({ seen: true, seen_at: now })
    .where(and(eq(reminder_receipts.reminder_id, id), eq(reminder_receipts.user_id, session.user.id)));

  return Response.json({ reminder: updated });
}

// ---- DELETE: undo complete (one-time only) -----------------------------------

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
  const { householdId } = membership;

  const [existing] = await db
    .select({ id: reminders.id, frequency: reminders.frequency, household_id: reminders.household_id })
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.household_id, householdId), isNull(reminders.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }
  if (existing.frequency !== "once") {
    return Response.json({ error: "Cannot undo recurring reminders" }, { status: 400 });
  }

  const [updated] = await db
    .update(reminders)
    .set({ completed: false, completed_at: null, completed_by: null, updated_at: new Date() })
    .where(eq(reminders.id, id))
    .returning();

  return Response.json({ reminder: updated });
}
