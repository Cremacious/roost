import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { calendarEvents, eventAttendees } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const { id } = await params

  let body: { status: 'going' | 'maybe' | 'not_going' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!['going', 'maybe', 'not_going'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Verify event exists and belongs to household
  const event = await db
    .select({ id: calendarEvents.id, householdId: calendarEvents.householdId, rsvpEnabled: calendarEvents.rsvpEnabled })
    .from(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (event.householdId !== householdId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!event.rsvpEnabled) return NextResponse.json({ error: 'RSVP not enabled for this event' }, { status: 400 })

  // Check if user is an attendee
  const existingAttendee = await db
    .select()
    .from(eventAttendees)
    .where(
      and(
        eq(eventAttendees.eventId, id),
        eq(eventAttendees.userId, session.user.id),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  // Only invited attendees may RSVP. Non-attendees are rejected rather than
  // silently added to the event's guest list.
  if (!existingAttendee) {
    return NextResponse.json({ error: 'You are not on the guest list for this event' }, { status: 403 })
  }

  await db
    .update(eventAttendees)
    .set({ rsvpStatus: body.status })
    .where(
      and(
        eq(eventAttendees.eventId, id),
        eq(eventAttendees.userId, session.user.id),
      )
    )

  return NextResponse.json({ success: true })
}
