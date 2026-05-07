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

  const { householdId, role } = membership
  const { id } = await params

  const existing = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.householdId !== householdId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    title?: string
    description?: string
    startTime?: string
    endTime?: string
    allDay?: boolean
    recurring?: boolean
    frequency?: string
    repeatEndType?: string
    repeatUntil?: string
    repeatOccurrences?: number
    category?: string
    location?: string
    notifyMemberIds?: string
    rsvpEnabled?: boolean
    attendeeIds?: string[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Partial<typeof existing> = {
    updatedAt: new Date(),
  }

  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.startTime !== undefined) updates.startTime = new Date(body.startTime)
  if (body.endTime !== undefined) updates.endTime = new Date(body.endTime)
  if (body.allDay !== undefined) updates.allDay = body.allDay
  if (body.recurring !== undefined) updates.recurring = body.recurring
  if (body.frequency !== undefined) updates.frequency = body.frequency as typeof existing.frequency
  if (body.repeatEndType !== undefined) updates.repeatEndType = body.repeatEndType as typeof existing.repeatEndType
  if (body.repeatUntil !== undefined) updates.repeatUntil = body.repeatUntil ? new Date(body.repeatUntil) : null
  if (body.repeatOccurrences !== undefined) updates.repeatOccurrences = body.repeatOccurrences
  if (body.category !== undefined) updates.category = body.category ?? null
  if (body.location !== undefined) updates.location = body.location?.trim() || null
  if (body.notifyMemberIds !== undefined) updates.notifyMemberIds = body.notifyMemberIds
  if (body.rsvpEnabled !== undefined) updates.rsvpEnabled = body.rsvpEnabled

  const [updated] = await db
    .update(calendarEvents)
    .set(updates)
    .where(eq(calendarEvents.id, id))
    .returning()

  // Update attendees if provided
  if (body.attendeeIds !== undefined) {
    await db.delete(eventAttendees).where(eq(eventAttendees.eventId, id))
    if (body.attendeeIds.length > 0) {
      await db.insert(eventAttendees).values(
        body.attendeeIds.map(uid => ({
          eventId: id,
          userId: uid,
          rsvpStatus: null,
        }))
      )
    }
  }

  return NextResponse.json({ event: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  const { id } = await params

  const existing = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.householdId !== householdId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db
    .update(calendarEvents)
    .set({ deletedAt: new Date() })
    .where(eq(calendarEvents.id, id))

  return NextResponse.json({ success: true })
}
