import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { calendar_events, event_attendees, households, member_permissions, users } from "@/db/schema";
import { and, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { checkCalendarEventLimit } from "@/lib/utils/premiumGating";

// ---- Permission helper -------------------------------------------------------

async function canAddCalendarEvent(
  userId: string,
  householdId: string,
  role: string
): Promise<boolean> {
  if (role === "child") return false;
  const [override] = await db
    .select({ enabled: member_permissions.enabled })
    .from(member_permissions)
    .where(
      and(
        eq(member_permissions.household_id, householdId),
        eq(member_permissions.user_id, userId),
        eq(member_permissions.permission, "calendar.add")
      )
    )
    .limit(1);
  return override ? override.enabled : true;
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

  const url = new URL(request.url);
  const now = new Date();
  const month = parseInt(url.searchParams.get("month") ?? String(now.getMonth() + 1), 10);
  const year = parseInt(url.searchParams.get("year") ?? String(now.getFullYear()), 10);

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 1, 0, 0, 0, 0);

  const eventRows = await db
    .select({
      id: calendar_events.id,
      title: calendar_events.title,
      description: calendar_events.description,
      start_time: calendar_events.start_time,
      end_time: calendar_events.end_time,
      all_day: calendar_events.all_day,
      created_by: calendar_events.created_by,
      created_at: calendar_events.created_at,
      creator_name: users.name,
      creator_avatar: users.avatar_color,
    })
    .from(calendar_events)
    .leftJoin(users, eq(calendar_events.created_by, users.id))
    .where(
      and(
        eq(calendar_events.household_id, householdId),
        isNull(calendar_events.deleted_at),
        gte(calendar_events.start_time, monthStart),
        lt(calendar_events.start_time, monthEnd)
      )
    )
    .orderBy(calendar_events.start_time);

  if (eventRows.length === 0) {
    return Response.json({ events: [] });
  }

  // Fetch attendees for all events
  const eventIds = eventRows.map((e) => e.id);
  const attendeeRows = await db
    .select({
      event_id: event_attendees.event_id,
      user_id: event_attendees.user_id,
      name: users.name,
      avatar_color: users.avatar_color,
    })
    .from(event_attendees)
    .leftJoin(users, eq(event_attendees.user_id, users.id))
    .where(inArray(event_attendees.event_id, eventIds));

  const attendeesByEvent = new Map<string, { userId: string; name: string | null; avatarColor: string | null }[]>();
  for (const a of attendeeRows) {
    if (!attendeesByEvent.has(a.event_id)) attendeesByEvent.set(a.event_id, []);
    attendeesByEvent.get(a.event_id)!.push({
      userId: a.user_id,
      name: a.name,
      avatarColor: a.avatar_color,
    });
  }

  const events = eventRows.map((e) => ({
    ...e,
    attendees: attendeesByEvent.get(e.id) ?? [],
  }));

  return Response.json({ events });
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

  const canAdd = await canAddCalendarEvent(session.user.id, householdId, membership.role);
  if (!canAdd) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    all_day?: boolean;
    attendee_ids?: string[];
    recurring?: boolean;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/calendar] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.start_time) {
    return Response.json({ error: "Start time is required" }, { status: 400 });
  }

  // Premium checks
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  const isPremium = household?.subscription_status === "premium";

  if (!isPremium) {
    if (body.recurring) {
      return Response.json(
        { error: "Recurring events require premium", code: "RECURRING_EVENTS_PREMIUM" },
        { status: 403 }
      );
    }
    const startDate = new Date(body.start_time);
    const { allowed, count } = await checkCalendarEventLimit(
      householdId,
      startDate.getMonth() + 1,
      startDate.getFullYear()
    );
    if (!allowed) {
      return Response.json(
        { error: "Free tier limit reached", code: "CALENDAR_LIMIT", limit: 20, current: count },
        { status: 403 }
      );
    }
  }

  const [event] = await db
    .insert(calendar_events)
    .values({
      household_id: householdId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      start_time: new Date(body.start_time),
      end_time: body.end_time ? new Date(body.end_time) : null,
      all_day: body.all_day ?? false,
      created_by: session.user.id,
    })
    .returning();

  if (body.attendee_ids && body.attendee_ids.length > 0) {
    await db.insert(event_attendees).values(
      body.attendee_ids.map((userId) => ({ event_id: event.id, user_id: userId }))
    );
  }

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "event_added",
    description: `added ${event.title} to the calendar`,
    entityId: event.id,
    entityType: "calendar_event",
  });

  return Response.json({ event }, { status: 201 });
}
