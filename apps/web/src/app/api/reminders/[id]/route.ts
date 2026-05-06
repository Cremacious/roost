import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { reminders } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { calcNextRemindAt } from '../route'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const [existing] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, note, remindAt, frequency, customDays, notifyType, notifyUserIds } = body

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (title !== undefined) updates.title = title.trim()
  if (note !== undefined) updates.note = note?.trim() ?? null
  if (notifyType !== undefined) updates.notifyType = notifyType
  if (notifyUserIds !== undefined) updates.notifyUserIds = JSON.stringify(notifyUserIds)
  if (remindAt !== undefined) {
    const remindDate = new Date(remindAt)
    updates.remindAt = remindDate
    const freq = frequency ?? existing.frequency
    const days = customDays ?? existing.customDays
    updates.nextRemindAt = calcNextRemindAt(remindDate, freq, days)
  }
  if (frequency !== undefined) updates.frequency = frequency
  if (customDays !== undefined) updates.customDays = customDays

  const [updated] = await db
    .update(reminders)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
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

  const { householdId, role } = membership

  const [existing] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.update(reminders).set({ deletedAt: new Date() }).where(eq(reminders.id, id))

  return NextResponse.json({ ok: true })
}
