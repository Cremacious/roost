import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores, choreCompletions } from '@/db/schema'
import { eq, and, isNull, gte, lt } from 'drizzle-orm'
import { advanceNextDueAt } from '../../route'
import { logActivity } from '@/lib/utils/activity'

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

  // Idempotency guard: one completion per chore/user/day. Without this, a rapid
  // double-submit (e.g. double-tapping the Today hero button before the refetch
  // lands) inserts a second completion row, double-counting points and
  // double-advancing the schedule. The uncheck (DELETE) path already scopes to
  // today's window, so at most one completion per day is the intended model.
  const alreadyCompleted = await db
    .select({ id: choreCompletions.id })
    .from(choreCompletions)
    .where(
      and(
        eq(choreCompletions.choreId, choreId),
        eq(choreCompletions.householdId, householdId),
        eq(choreCompletions.userId, session.user.id),
        gte(choreCompletions.completedAt, startOfToday()),
        lt(choreCompletions.completedAt, startOfTomorrow()),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  if (alreadyCompleted) {
    return NextResponse.json({
      ok: true,
      alreadyCompleted: true,
      nextDueAt: chore.nextDueAt?.toISOString() ?? null,
    })
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
      // Remember the pre-advance due date so an uncheck can restore it.
      prevDueAt: chore.nextDueAt ?? null,
      nextDueAt,
      updatedAt: now,
    })
    .where(eq(chores.id, choreId))

  await logActivity({
    householdId,
    userId: session.user.id,
    type: 'chore_completed',
    entityId: choreId,
    entityType: 'chore',
    description: `completed "${chore.title}"`,
  })

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

  const chore = await db
    .select({ prevDueAt: chores.prevDueAt })
    .from(chores)
    .where(and(eq(chores.id, choreId), eq(chores.householdId, householdId), isNull(chores.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  const deleted = await db
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
    .returning({ id: choreCompletions.id })

  // Only restore the schedule if we actually undid a completion.
  if (deleted.length > 0 && chore?.prevDueAt) {
    await db
      .update(chores)
      .set({ nextDueAt: chore.prevDueAt, prevDueAt: null, updatedAt: new Date() })
      .where(eq(chores.id, choreId))
  }

  return NextResponse.json({ ok: true })
}
