import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores, choreCompletions } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

function calcNextDueAt(frequency: string, customDays: string | null, from = new Date()): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
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
    default:
      next.setDate(next.getDate() + 7)
  }
  return next
}

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: choreId } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const chore = await db
    .select()
    .from(chores)
    .where(
      and(
        eq(chores.id, choreId),
        eq(chores.householdId, householdId),
        isNull(chores.deletedAt),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  if (!chore) {
    return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
  }

  const now = new Date()
  const nextDueAt = calcNextDueAt(chore.frequency, chore.customDays ?? null, now)
  const weekStart = getWeekStart()

  await db.insert(choreCompletions).values({
    householdId,
    choreId,
    userId: session.user.id,
    completedAt: now,
    points: 10,
    weekStart,
  })

  await db
    .update(chores)
    .set({
      lastCompletedAt: now,
      nextDueAt,
      updatedAt: now,
    })
    .where(eq(chores.id, choreId))

  return NextResponse.json({ ok: true, nextDueAt: nextDueAt.toISOString() })
}
