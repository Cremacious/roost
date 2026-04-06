import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reminders, users } from "@/db/schema";
import { and, eq, isNull, lte } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { addHours } from "date-fns";

// ---- GET: reminders due in the next 24 hours for this user ------------------

export async function GET(request: NextRequest): Promise<Response> {
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

  const now = new Date();
  const in24h = addHours(now, 24);

  const reminderRows = await db
    .select({
      id: reminders.id,
      title: reminders.title,
      note: reminders.note,
      remind_at: reminders.remind_at,
      frequency: reminders.frequency,
      notify_type: reminders.notify_type,
      notify_user_ids: reminders.notify_user_ids,
      completed: reminders.completed,
      next_remind_at: reminders.next_remind_at,
      created_by: reminders.created_by,
      creator_name: users.name,
      creator_avatar: users.avatar_color,
    })
    .from(reminders)
    .leftJoin(users, eq(reminders.created_by, users.id))
    .where(
      and(
        eq(reminders.household_id, householdId),
        isNull(reminders.deleted_at),
        eq(reminders.completed, false),
        lte(reminders.next_remind_at, in24h)
      )
    );

  const userId = session.user.id;

  // Filter to reminders this user should see
  const due = reminderRows.filter((r) => {
    if (r.notify_type === "household") return true;
    if (r.notify_type === "self") return r.created_by === userId;
    if (r.notify_type === "specific") {
      try {
        const ids = JSON.parse(r.notify_user_ids ?? "[]") as string[];
        return ids.includes(userId);
      } catch {
        return false;
      }
    }
    return false;
  });

  return Response.json({ due });
}
