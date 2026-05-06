import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { reminders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { calcNextRemindAt } from '../../route'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const [existing] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOnce = !existing.frequency || existing.frequency === 'once'

  if (isOnce) {
    const [updated] = await db
      .update(reminders)
      .set({ completed: true, updatedAt: new Date() })
      .where(eq(reminders.id, id))
      .returning()
    return NextResponse.json({ reminder: updated })
  }

  // Recurring: advance next_remind_at, set snoozed_until
  const base = new Date(Math.max(existing.nextRemindAt.getTime(), Date.now()))
  const next = calcNextRemindAt(base, existing.frequency, existing.customDays)

  const [updated] = await db
    .update(reminders)
    .set({ snoozedUntil: next, nextRemindAt: next, updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .returning()

  return NextResponse.json({ reminder: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const [existing] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOnce = !existing.frequency || existing.frequency === 'once'
  if (!isOnce) {
    return NextResponse.json({ error: 'Cannot undo recurring reminders' }, { status: 400 })
  }

  const [updated] = await db
    .update(reminders)
    .set({ completed: false, updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .returning()

  return NextResponse.json({ reminder: updated })
}
