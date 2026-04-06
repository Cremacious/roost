import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reminder_receipts, reminders } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST: mark reminder as seen for current user ---------------------------

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

  // Verify reminder belongs to this household
  const [existing] = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.household_id, householdId), isNull(reminders.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Reminder not found" }, { status: 404 });
  }

  const now = new Date();

  // Upsert receipt for this user
  const [receipt] = await db
    .insert(reminder_receipts)
    .values({ reminder_id: id, user_id: session.user.id, seen: true, seen_at: now })
    .onConflictDoUpdate({
      target: [reminder_receipts.reminder_id, reminder_receipts.user_id],
      set: { seen: true, seen_at: now },
    })
    .returning();

  return Response.json({ receipt });
}
