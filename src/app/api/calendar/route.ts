import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission, isHouseholdPremium } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { calendarEvents, eventAttendees, householdMembers, users } from '@/db/schema'
import { eq, and, isNull, gte, lt, count, inArray } from 'drizzle-orm'
import { expandRecurring } from '@/lib/utils/recurrence'
import { FREE_TIER_LIMITS } from '@/lib/constants/freeTierLimits'

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const { searchParams } = req.nextUrl

  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  const now = new Date()
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1

  // Month range: first of month to first of next month
  const rangeStart = new Date(year, month - 1, 1)
  const rangeEnd   = new Date(year, month, 1)

  // Fetch non-recurring events in range
  const nonRecurringRows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      description: calendarEvents.description,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      allDay: calendarEvents.allDay,
      recurring: calendarEvents.recurring,
      frequency: calendarEvents.frequency,
      repeatEndType: calendarEvents.repeatEndType,
      repeatUntil: calendarEvents.repeatUntil,
      repeatOccurrences: calendarEvents.repeatOccurrences,
      category: calendarEvents.category,
      location: calendarEvents.location,
      notifyMemberIds: calendarEvents.notifyMemberIds,
      rsvpEnabled: calendarEvents.rsvpEnabled,
      createdBy: calendarEvents.createdBy,
      creatorName: users.name,
    })
    .from(calendarEvents)
    .innerJoin(users, eq(calendarEvents.createdBy, users.id))
    .where(
      and(
        eq(calendarEvents.householdId, householdId),
        isNull(calendarEvents.deletedAt),
        eq(calendarEvents.recurring, false),
        gte(calendarEvents.startTime, rangeStart),
        lt(calendarEvents.startTime, rangeEnd),
      )
    )

  // Fetch all recurring templates
  const recurringRows = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      description: calendarEvents.description,
      startTime: calendarEvents.startTime,
      endTime: calendarEvents.endTime,
      allDay: calendarEvents.allDay,
      recurring: calendarEvents.recurring,
      frequency: calendarEvents.frequency,
      repeatEndType: calendarEvents.repeatEndType,
      repeatUntil: calendarEvents.repeatUntil,
      repeatOccurrences: calendarEvents.repeatOccurrences,
      category: calendarEvents.category,
      location: calendarEvents.location,
      notifyMemberIds: calendarEvents.notifyMemberIds,
      rsvpEnabled: calendarEvents.rsvpEnabled,
      createdBy: calendarEvents.createdBy,
      creatorName: users.name,
    })
    .from(calendarEvents)
    .innerJoin(users, eq(calendarEvents.createdBy, users.id))
    .where(
      and(
        eq(calendarEvents.householdId, householdId),
        isNull(calendarEvents.deletedAt),
        eq(calendarEvents.recurring, true),
      )
    )

  // Expand recurring
  const expandedRecurring = recurringRows.flatMap(e => expandRecurring(e, rangeStart, rangeEnd))

  // Combine and sort
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEvents: Array<any> = [
    ...nonRecurringRows.map(e => ({ ...e, isRecurring: false, templateStartTime: e.startTime.toISOString() })),
    ...expandedRecurring,
  ]
  allEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Fetch attendees for all events in a single query scoped to those IDs
  const eventIds = [...new Set(allEvents.map(e => e.id))]
  const attendeeMap = new Map<string, Array<{ userId: string; name: string; avatarColor: string | null; rsvpStatus: string | null }>>()

  if (eventIds.length > 0) {
    const attendeeRows = await db
      .select({
        eventId: eventAttendees.eventId,
        userId: eventAttendees.userId,
        rsvpStatus: eventAttendees.rsvpStatus,
        name: users.name,
        avatarColor: users.avatarColor,
      })
      .from(eventAttendees)
      .innerJoin(users, eq(eventAttendees.userId, users.id))
      .where(inArray(eventAttendees.eventId, eventIds))

    for (const row of attendeeRows) {
      if (!attendeeMap.has(row.eventId)) attendeeMap.set(row.eventId, [])
      attendeeMap.get(row.eventId)!.push({
        userId: row.userId,
        name: row.name,
        avatarColor: row.avatarColor,
        rsvpStatus: row.rsvpStatus,
      })
    }
  }

  const events = allEvents.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    allDay: e.allDay,
    recurring: e.recurring,
    frequency: e.frequency,
    repeatEndType: e.repeatEndType,
    repeatUntil: e.repeatUntil ? e.repeatUntil.toISOString() : null,
    repeatOccurrences: e.repeatOccurrences,
    category: e.category,
    location: e.location,
    notifyMemberIds: e.notifyMemberIds,
    rsvpEnabled: e.rsvpEnabled,
    createdBy: e.createdBy,
    creatorName: e.creatorName,
    attendees: attendeeMap.get(e.id) ?? [],
    isRecurring: e.isRecurring,
    templateStartTime: e.templateStartTime,
  }))

  return NextResponse.json({ events })
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  const userId = session.user.id

  // Children are view-only on the calendar, regardless of permission overrides.
  if (role === 'child') {
    return NextResponse.json({ error: 'Children cannot add calendar events', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const canAdd = await checkMemberPermission(userId, householdId, role, 'calendarAdd')
  if (!canAdd) return NextResponse.json({ error: 'You do not have permission to add calendar events', code: 'PERMISSION_DENIED' }, { status: 403 })

  let body: {
    title: string
    description?: string
    startTime: string
    endTime: string
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

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!body.startTime || !body.endTime) {
    return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 })
  }
  if (body.recurring && !body.frequency) {
    return NextResponse.json({ error: 'Frequency is required for recurring events' }, { status: 400 })
  }

  const isPremium = await isHouseholdPremium(householdId)

  // Recurring events are premium-only.
  if (body.recurring && !isPremium) {
    return NextResponse.json(
      { error: 'Recurring events are a premium feature', code: 'RECURRING_EVENTS_PREMIUM' },
      { status: 403 },
    )
  }

  // Free households can create a limited number of events per calendar month.
  if (!isPremium) {
    const startDt = new Date(body.startTime)
    const monthStart = new Date(startDt.getFullYear(), startDt.getMonth(), 1)
    const monthEnd = new Date(startDt.getFullYear(), startDt.getMonth() + 1, 1)
    const [{ n }] = await db
      .select({ n: count() })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.householdId, householdId),
          isNull(calendarEvents.deletedAt),
          eq(calendarEvents.recurring, false),
          gte(calendarEvents.startTime, monthStart),
          lt(calendarEvents.startTime, monthEnd),
        ),
      )
    const limit = FREE_TIER_LIMITS.calendarEventsPerMonth
    if (n >= limit) {
      return NextResponse.json(
        {
          error: `Free households are limited to ${limit} events per month`,
          code: 'CALENDAR_LIMIT',
          limit,
          current: n,
        },
        { status: 403 },
      )
    }
  }

  const [newEvent] = await db
    .insert(calendarEvents)
    .values({
      householdId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay ?? false,
      recurring: body.recurring ?? false,
      frequency: body.frequency as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | undefined,
      repeatEndType: body.repeatEndType as 'forever' | 'until_date' | 'after_occurrences' | undefined,
      repeatUntil: body.repeatUntil ? new Date(body.repeatUntil) : null,
      repeatOccurrences: body.repeatOccurrences ?? null,
      category: body.category ?? null,
      location: body.location?.trim() || null,
      notifyMemberIds: body.notifyMemberIds ?? null,
      rsvpEnabled: body.rsvpEnabled ?? false,
      createdBy: userId,
    })
    .returning()

  // Insert attendees
  if (body.attendeeIds && body.attendeeIds.length > 0) {
    await db.insert(eventAttendees).values(
      body.attendeeIds.map(uid => ({
        eventId: newEvent.id,
        userId: uid,
        rsvpStatus: null,
      }))
    )
  }

  // Fire-and-forget push notifications
  if (body.notifyMemberIds) {
    sendEventNotifications(newEvent.id, body.title, new Date(body.startTime), body.location ?? null, body.notifyMemberIds, householdId).catch(() => {})
  }

  return NextResponse.json({ event: newEvent }, { status: 201 })
}

// ─── Push notification helper ──────────────────────────────────────────────────

async function sendEventNotifications(
  eventId: string,
  title: string,
  startTime: Date,
  location: string | null,
  notifyMemberIds: string,
  householdId: string,
) {
  let targetUserIds: string[]

  if (notifyMemberIds === 'all') {
    const members = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(and(eq(householdMembers.householdId, householdId), isNull(householdMembers.deletedAt)))
    targetUserIds = members.map(m => m.userId)
  } else {
    try {
      targetUserIds = JSON.parse(notifyMemberIds) as string[]
    } catch {
      return
    }
  }

  if (targetUserIds.length === 0) return

  const userRows = await db
    .select({ id: users.id, pushToken: users.pushToken })
    .from(users)
    .where(inArray(users.id, targetUserIds))

  const tokens = userRows.map(u => u.pushToken).filter(Boolean)
  if (tokens.length === 0) return

  const formattedTime = startTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const body = location ? `${formattedTime} at ${location}` : formattedTime

  await Promise.allSettled(
    tokens.map(token =>
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: token, title, body }),
      })
    )
  )
}
