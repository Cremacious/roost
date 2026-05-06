import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { calendar_events, event_attendees } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

const VALID_STATUSES = ["attending", "not_attending", "maybe"] as const;
type RsvpStatus = (typeof VALID_STATUSES)[number];

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

  const [event] = await db
    .select({ id: calendar_events.id, rsvpEnabled: calendar_events.rsvp_enabled })
    .from(calendar_events)
    .where(
      and(
        eq(calendar_events.id, id),
        eq(calendar_events.household_id, membership.householdId),
        isNull(calendar_events.deleted_at)
      )
    )
    .limit(1);

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }
  if (!event.rsvpEnabled) {
    return Response.json({ error: "RSVP is not enabled for this event" }, { status: 400 });
  }

  const [attendee] = await db
    .select({ id: event_attendees.id })
    .from(event_attendees)
    .where(
      and(
        eq(event_attendees.event_id, id),
        eq(event_attendees.user_id, session.user.id)
      )
    )
    .limit(1);

  if (!attendee) {
    return Response.json({ error: "You are not an attendee of this event" }, { status: 403 });
  }

  let body: { rsvp_status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.rsvp_status || !VALID_STATUSES.includes(body.rsvp_status as RsvpStatus)) {
    return Response.json(
      { error: "rsvp_status must be one of: attending, not_attending, maybe" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(event_attendees)
    .set({ rsvp_status: body.rsvp_status })
    .where(
      and(
        eq(event_attendees.event_id, id),
        eq(event_attendees.user_id, session.user.id)
      )
    )
    .returning();

  return Response.json({ attendee: updated });
}
