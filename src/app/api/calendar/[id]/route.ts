import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { calendar_events, household_members, users } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- Push notification helper ------------------------------------------------

async function sendEventPushNotifications(
  notifyMemberIds: string | null,
  householdId: string,
  title: string,
  startTime: Date,
  location: string | null
): Promise<void> {
  if (!notifyMemberIds) return;

  let userIds: string[];
  if (notifyMemberIds === "all") {
    const members = await db
      .select({ userId: household_members.user_id })
      .from(household_members)
      .where(
        and(
          eq(household_members.household_id, householdId),
          isNull(household_members.deleted_at)
        )
      );
    userIds = members.map((m) => m.userId);
  } else {
    try {
      userIds = JSON.parse(notifyMemberIds) as string[];
    } catch {
      return;
    }
  }

  if (userIds.length === 0) return;

  const userRows = await db
    .select({ pushToken: users.push_token })
    .from(users)
    .where(inArray(users.id, userIds));

  const tokens = userRows.map((u) => u.pushToken).filter(Boolean) as string[];
  if (tokens.length === 0) return;

  const { format } = await import("date-fns");
  const dateStr = format(startTime, "EEE MMM d 'at' h:mm a");
  const body = location ? `${dateStr} at ${location}` : dateStr;

  await Promise.allSettled(
    tokens.map((token) =>
      fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: token, title, body, sound: "default" }),
      })
    )
  );
}

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
    .from(calendar_events)
    .where(
      and(
        eq(calendar_events.id, id),
        eq(calendar_events.household_id, householdId),
        isNull(calendar_events.deleted_at)
      )
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string | null;
    all_day?: boolean;
    // Recurring fields — editing a recurring template updates ALL instances
    // since instances are generated dynamically on fetch from this row.
    recurring?: boolean;
    frequency?: string | null;
    repeat_end_type?: string | null;
    repeat_until?: string | null;
    repeat_occurrences?: number | null;
    // V2 fields
    category?: string | null;
    location?: string | null;
    notify_member_ids?: string | string[] | null;
    rsvp_enabled?: boolean;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[PATCH /api/calendar/[id]] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(calendar_events)
    .set({
      title: body.title?.trim() ?? existing.title,
      description:
        body.description !== undefined
          ? body.description?.trim() || null
          : existing.description,
      start_time: body.start_time ? new Date(body.start_time) : existing.start_time,
      end_time:
        body.end_time !== undefined
          ? body.end_time ? new Date(body.end_time) : null
          : existing.end_time,
      all_day: body.all_day ?? existing.all_day,
      recurring: body.recurring ?? existing.recurring,
      frequency: body.recurring !== undefined
        ? (body.recurring ? (body.frequency ?? existing.frequency) : null)
        : existing.frequency,
      repeat_end_type: body.recurring !== undefined
        ? (body.recurring ? (body.repeat_end_type ?? existing.repeat_end_type ?? "forever") : null)
        : existing.repeat_end_type,
      repeat_until: body.repeat_until !== undefined
        ? (body.repeat_until ? new Date(body.repeat_until) : null)
        : existing.repeat_until,
      repeat_occurrences: body.repeat_occurrences !== undefined
        ? body.repeat_occurrences
        : existing.repeat_occurrences,
      // V2 fields
      category: body.category !== undefined ? (body.category ?? null) : existing.category,
      location: body.location !== undefined ? (body.location?.trim() || null) : existing.location,
      notify_member_ids: body.notify_member_ids !== undefined
        ? (body.notify_member_ids === null
            ? null
            : body.notify_member_ids === "all"
              ? "all"
              : JSON.stringify(
                  Array.isArray(body.notify_member_ids)
                    ? body.notify_member_ids
                    : [body.notify_member_ids]
                ))
        : existing.notify_member_ids,
      rsvp_enabled: body.rsvp_enabled !== undefined ? body.rsvp_enabled : (existing?.rsvp_enabled ?? false),
      updated_at: new Date(),
    })
    .where(eq(calendar_events.id, id))
    .returning();

  // Fire push notifications when start time or location changed
  const startTimeChanged =
    body.start_time !== undefined &&
    body.start_time !== existing?.start_time?.toISOString();
  const locationChanged =
    body.location !== undefined &&
    body.location !== existing?.location;

  if ((startTimeChanged || locationChanged) && updated.notify_member_ids) {
    await sendEventPushNotifications(
      updated.notify_member_ids,
      householdId,
      updated.title,
      updated.start_time,
      updated.location ?? null
    );
  }

  return Response.json({ event: updated });
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
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId, role } = membership;

  const [existing] = await db
    .select({ id: calendar_events.id, created_by: calendar_events.created_by })
    .from(calendar_events)
    .where(
      and(
        eq(calendar_events.id, id),
        eq(calendar_events.household_id, householdId),
        isNull(calendar_events.deleted_at)
      )
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deleting a recurring event removes all instances since they are generated
  // dynamically from this template row — no child rows to clean up.
  await db
    .update(calendar_events)
    .set({ deleted_at: new Date() })
    .where(eq(calendar_events.id, id));

  return Response.json({ ok: true });
}
