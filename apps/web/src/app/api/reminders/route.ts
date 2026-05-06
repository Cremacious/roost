import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { reminders } from '@/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

export function calcNextRemindAt(remindAt: Date, frequency: string | null, customDays: string | null): Date {
  if (!frequency || frequency === 'once') return remindAt
  const next = new Date(remindAt)
  if (frequency === 'daily') next.setDate(next.getDate() + 1)
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7)
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  else if (frequency === 'custom' && customDays) {
    next.setDate(next.getDate() + parseInt(customDays, 10))
  }
  return next
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const rows = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.householdId, householdId), isNull(reminders.deletedAt)))
    .orderBy(asc(reminders.nextRemindAt))

  return NextResponse.json({ reminders: rows })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const body = await req.json()
  const { title, note, remindAt, frequency, customDays, notifyType, notifyUserIds } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!remindAt) return NextResponse.json({ error: 'Remind date is required' }, { status: 400 })

  const remindDate = new Date(remindAt)
  const nextRemindDate = calcNextRemindAt(remindDate, frequency ?? 'once', customDays ?? null)

  const [reminder] = await db
    .insert(reminders)
    .values({
      householdId,
      title: title.trim(),
      note: note?.trim() ?? null,
      remindAt: remindDate,
      nextRemindAt: nextRemindDate,
      frequency: frequency ?? 'once',
      customDays: customDays ?? null,
      notifyType: notifyType ?? 'self',
      notifyUserIds: JSON.stringify(notifyUserIds ?? []),
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ reminder }, { status: 201 })
}
