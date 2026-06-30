import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores, choreCompletions, users, memberPermissions } from '@/db/schema'
import { eq, and, isNull, gte, lt } from 'drizzle-orm'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfTomorrow() {
  const d = startOfToday()
  d.setDate(d.getDate() + 1)
  return d
}

// Largest valid day for a given month (handles 28/29/30/31).
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

// Parse a "YYYY-MM-DD" date input into local noon of that calendar day.
// Noon keeps the stored day stable when the timestamp is read back in another
// timezone, so the chosen weekday / day-of-month renders correctly client-side.
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0)
}

// First occurrence of the selected day on or after `from`.
//  - weekly / biweekly: customDays holds a single weekday (0-6).
//  - monthly: customDays holds a single day-of-month (1-31), clamped for short months.
//  - daily: every day qualifies, so the first occurrence is the start date itself.
//  - custom (legacy): customDays holds a space-separated weekday list.
export function calcNextDueAt(frequency: string, customDays: string | null, from = new Date()): Date {
  const next = new Date(from)
  next.setHours(12, 0, 0, 0)
  const hasDay = customDays != null && customDays !== ''

  switch (frequency) {
    case 'daily':
      break
    case 'weekly':
    case 'biweekly': {
      const target = hasDay ? Number(customDays) : next.getDay()
      const daysUntil = (((target - next.getDay()) % 7) + 7) % 7
      next.setDate(next.getDate() + daysUntil)
      break
    }
    case 'monthly': {
      const dom = hasDay ? Number(customDays) : next.getDate()
      const thisMonth = new Date(next)
      thisMonth.setDate(daysInMonth(thisMonth.getFullYear(), thisMonth.getMonth()) >= dom ? dom : daysInMonth(thisMonth.getFullYear(), thisMonth.getMonth()))
      if (thisMonth >= next) return thisMonth
      const nextMonth = new Date(next.getFullYear(), next.getMonth() + 1, 1, 12, 0, 0, 0)
      nextMonth.setDate(Math.min(dom, daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())))
      return nextMonth
    }
    case 'custom': {
      if (customDays) {
        const days = customDays.split(' ').map(Number).sort((a, b) => a - b)
        const todayDow = next.getDay()
        const nextDay = days.find(d => d >= todayDow) ?? days[0]
        const daysUntil = nextDay >= todayDow ? nextDay - todayDow : 7 - todayDow + nextDay
        next.setDate(next.getDate() + daysUntil)
      } else {
        next.setDate(next.getDate() + 7)
      }
      break
    }
    default: {
      const target = hasDay ? Number(customDays) : next.getDay()
      const daysUntil = (((target - next.getDay()) % 7) + 7) % 7
      next.setDate(next.getDate() + daysUntil)
    }
  }
  return next
}

// Advance the schedule one period past the LAST due date, preserving the chosen
// weekday / day-of-month. Used when a recurring chore is completed. If the chore
// was overdue, keep advancing until the next due date is in the future.
export function advanceNextDueAt(
  frequency: string,
  customDays: string | null,
  lastDue: Date,
  now = new Date(),
): Date {
  const hasDay = customDays != null && customDays !== ''

  const advanceOne = (d: Date): Date => {
    const r = new Date(d)
    switch (frequency) {
      case 'daily':    r.setDate(r.getDate() + 1); break
      case 'weekly':   r.setDate(r.getDate() + 7); break
      case 'biweekly': r.setDate(r.getDate() + 14); break
      case 'monthly': {
        const dom = hasDay ? Number(customDays) : r.getDate()
        const m = new Date(r.getFullYear(), r.getMonth() + 1, 1, 12, 0, 0, 0)
        m.setDate(Math.min(dom, daysInMonth(m.getFullYear(), m.getMonth())))
        return m
      }
      case 'custom': return calcNextDueAt('custom', customDays, r)
      default: r.setDate(r.getDate() + 7)
    }
    return r
  }

  let next = advanceOne(lastDue)
  let guard = 0
  while (next <= now && guard < 600) {
    next = advanceOne(next)
    guard++
  }
  return next
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const [choreRows, todayCompletions] = await Promise.all([
    db
      .select({
        id: chores.id,
        title: chores.title,
        description: chores.description,
        frequency: chores.frequency,
        customDays: chores.customDays,
        nextDueAt: chores.nextDueAt,
        lastCompletedAt: chores.lastCompletedAt,
        assignedTo: chores.assignedTo,
        createdBy: chores.createdBy,
        householdId: chores.householdId,
        snoozedUntil: chores.snoozedUntil,
        assigneeName: users.name,
        assigneeAvatar: users.avatarColor,
      })
      .from(chores)
      .leftJoin(users, eq(chores.assignedTo, users.id))
      .where(and(eq(chores.householdId, householdId), isNull(chores.deletedAt))),

    db
      .select()
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.householdId, householdId),
          gte(choreCompletions.completedAt, startOfToday()),
          lt(choreCompletions.completedAt, startOfTomorrow()),
        )
      ),
  ])

  const completedIds = new Set(todayCompletions.map(c => c.choreId))
  const myCompleted = new Set(
    todayCompletions.filter(c => c.userId === session.user.id).map(c => c.choreId)
  )

  const now = new Date()
  const result = choreRows.map(chore => ({
    id: chore.id,
    title: chore.title,
    description: chore.description,
    frequency: chore.frequency,
    customDays: chore.customDays,
    nextDueAt: chore.nextDueAt?.toISOString() ?? null,
    lastCompletedAt: chore.lastCompletedAt?.toISOString() ?? null,
    assignedTo: chore.assignedTo,
    assigneeName: chore.assigneeName,
    assigneeAvatar: chore.assigneeAvatar,
    createdBy: chore.createdBy,
    householdId: chore.householdId,
    snoozedUntil: chore.snoozedUntil?.toISOString() ?? null,
    isSnoozed: chore.snoozedUntil ? chore.snoozedUntil > now : false,
    isCompleteToday: completedIds.has(chore.id),
    completedTodayByMe: myCompleted.has(chore.id),
  }))

  return NextResponse.json({ chores: result, householdId })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  if (role !== 'admin') {
    const [perms] = await db
      .select({ choresAdd: memberPermissions.choresAdd })
      .from(memberPermissions)
      .where(and(
        eq(memberPermissions.userId, session.user.id),
        eq(memberPermissions.householdId, householdId),
      ))
      .limit(1)

    if (!perms?.choresAdd) {
      return NextResponse.json({ error: 'You do not have permission to add chores', code: 'PERMISSION_DENIED' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => null)
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const { title, description, assignedTo, frequency = 'weekly', customDays, startDate } = body
  const from = startDate ? parseDateInput(startDate) : new Date()
  const nextDueAt = calcNextDueAt(frequency, customDays ?? null, from)

  const [chore] = await db
    .insert(chores)
    .values({
      householdId,
      title: title.trim(),
      description: description?.trim() || null,
      assignedTo: assignedTo || null,
      frequency,
      customDays: customDays || null,
      nextDueAt,
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ chore })
}
