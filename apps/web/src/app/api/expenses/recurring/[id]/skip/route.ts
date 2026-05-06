import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { recurringExpenses, expenses } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { advanceRecurringDate } from '../../route'

// Admin skips this cycle — deletes draft if exists and advances schedule
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const template = await db
    .select()
    .from(recurringExpenses)
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.householdId, householdId), isNull(recurringExpenses.deletedAt)))
    .then(r => r[0] ?? null)

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // soft-delete any pending draft
  await db
    .update(expenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(expenses.recurringTemplateId, id), eq(expenses.isRecurringDraft, true)))

  const nextDate = advanceRecurringDate(new Date(template.nextDueDate), template.frequency)
  await db
    .update(recurringExpenses)
    .set({ nextDueDate: nextDate })
    .where(eq(recurringExpenses.id, id))

  return NextResponse.json({ ok: true })
}
