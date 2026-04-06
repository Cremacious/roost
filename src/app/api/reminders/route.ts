import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reminders, reminder_receipts, users } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { addDays, addMonths } from "date-fns";

// ---- Helper: calculate next_remind_at ---------------------------------------

export function calcNextRemindAt(
  frequency: string,
  customDays: number[] | null,
  from: Date
): Date | null {
  switch (frequency) {
    case "once":
      return null;
    case "daily":
      return addDays(from, 1);
    case "weekly":
      return addDays(from, 7);
    case "monthly":
      return addMonths(from, 1);
    case "custom": {
      if (!customDays || customDays.length === 0) return addDays(from, 1);
      for (let i = 1; i <= 7; i++) {
        const candidate = addDays(from, i);
        if (customDays.includes(candidate.getDay())) return candidate;
      }
      return addDays(from, 1);
    }
    default:
      return null;
  }
}

// ---- Helper: resolve notified user ids --------------------------------------

function resolveNotifiedUserIds(
  notifyType: string,
  notifyUserIds: string | null,
  createdBy: string,
  allMemberIds: string[]
): string[] {
  if (notifyType === "household") return allMemberIds;
  if (notifyType === "specific") {
    try {
      return JSON.parse(notifyUserIds ?? "[]") as string[];
    } catch {
      return [];
    }
  }
  // self
  return [createdBy];
}

// ---- GET --------------------------------------------------------------------

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

  const reminderRows = await db
    .select({
      id: reminders.id,
      title: reminders.title,
      note: reminders.note,
      remind_at: reminders.remind_at,
      frequency: reminders.frequency,
      custom_days: reminders.custom_days,
      notify_type: reminders.notify_type,
      notify_user_ids: reminders.notify_user_ids,
      completed: reminders.completed,
      completed_at: reminders.completed_at,
      completed_by: reminders.completed_by,
      last_sent_at: reminders.last_sent_at,
      next_remind_at: reminders.next_remind_at,
      created_by: reminders.created_by,
      created_at: reminders.created_at,
      updated_at: reminders.updated_at,
      creator_name: users.name,
      creator_avatar: users.avatar_color,
    })
    .from(reminders)
    .leftJoin(users, eq(reminders.created_by, users.id))
    .where(and(eq(reminders.household_id, householdId), isNull(reminders.deleted_at)))
    .orderBy(asc(reminders.next_remind_at));

  const userId = session.user.id;

  // Filter to reminders this user should see
  const visible = reminderRows.filter((r) => {
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

  return Response.json({ reminders: visible });
}

// ---- POST -------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
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
  const { householdId } = membership;

  let body: {
    title?: string;
    note?: string;
    remind_at?: string;
    frequency?: string;
    custom_days?: number[];
    notify_type?: string;
    notify_user_ids?: string[];
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/reminders] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.remind_at) {
    return Response.json({ error: "Reminder time is required" }, { status: 400 });
  }

  const remindAt = new Date(body.remind_at);
  const frequency = body.frequency ?? "once";
  const customDays = body.custom_days ?? null;
  const nextRemindAt = calcNextRemindAt(frequency, customDays, remindAt) ?? remindAt;

  const notifyType = body.notify_type ?? "self";
  const notifyUserIds = body.notify_user_ids ? JSON.stringify(body.notify_user_ids) : null;

  const [reminder] = await db
    .insert(reminders)
    .values({
      household_id: householdId,
      created_by: session.user.id,
      title: body.title.trim(),
      note: body.note?.trim() || null,
      remind_at: remindAt,
      frequency,
      custom_days: customDays ? JSON.stringify(customDays) : null,
      notify_type: notifyType,
      notify_user_ids: notifyUserIds,
      next_remind_at: nextRemindAt,
    })
    .returning();

  // Get all household member ids to resolve notified users
  const { household_members } = await import("@/db/schema");
  const memberRows = await db
    .select({ user_id: household_members.user_id })
    .from(household_members)
    .where(eq(household_members.household_id, householdId));
  const allMemberIds = memberRows.map((m) => m.user_id);

  const notifiedIds = resolveNotifiedUserIds(notifyType, notifyUserIds, session.user.id, allMemberIds);

  if (notifiedIds.length > 0) {
    await db.insert(reminder_receipts).values(
      notifiedIds.map((uid) => ({
        reminder_id: reminder.id,
        user_id: uid,
      }))
    ).onConflictDoNothing();
  }

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "reminder_set",
    description: `set a reminder: ${reminder.title}`,
    entityId: reminder.id,
    entityType: "reminder",
  });

  return Response.json({ reminder }, { status: 201 });
}
