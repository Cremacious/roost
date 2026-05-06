import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores, choreCompletions, users } from '@/db/schema'
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

export function calcNextDueAt(frequency: string, customDays: string | null, from = new Date()): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'daily':    next.setDate(next.getDate() + 1); break
    case 'weekly':   next.setDate(next.getDate() + 7); break
    case 'biweekly': next.setDate(next.getDate() + 14); break
    case 'monthly':  next.setMonth(next.getMonth() + 1); break
    case 'custom': {
      if (customDays) {
        const days = customDays.split(' ').map(Number).sort((a, b) => a - b)
        const todayDow = next.getDay()
        const nextDay = days.find(d => d > todayDow) ?? days[0]
        const daysUntil = nextDay > todayDow ? nextDay - todayDow : 7 - todayDow + nextDay
        next.setDate(next.getDate() + daysUntil)
      } else {
        next.setDate(next.getDate() + 7)
      }
      break
    }
    default: next.setDate(next.getDate() + 7)
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

  const { householdId } = membership

  const body = await request.json().catch(() => null)
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const { title, description, assignedTo, frequency = 'weekly', customDays } = body
  const nextDueAt = calcNextDueAt(frequency, customDays ?? null)

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
