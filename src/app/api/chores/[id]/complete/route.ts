import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores, choreCompletions } from '@/db/schema'
import { eq, and, isNull, gte, lt } from 'drizzle-orm'
import { advanceNextDueAt } from '../../route'

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
  // Advance from the chore's existing due date so the chosen weekday /
  // day-of-month is preserved across completions.
  const lastDue = chore.nextDueAt ?? now
  const nextDueAt = advanceNextDueAt(chore.frequency, chore.customDays ?? null, lastDue, now)
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: choreId } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  await db
    .delete(choreCompletions)
    .where(
      and(
        eq(choreCompletions.choreId, choreId),
        eq(choreCompletions.householdId, householdId),
        eq(choreCompletions.userId, session.user.id),
        gte(choreCompletions.completedAt, startOfToday()),
        lt(choreCompletions.completedAt, startOfTomorrow()),
      )
    )

  return NextResponse.json({ ok: true })
}
