import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { recurringExpenses, expenses, expenseSplits } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { advanceRecurringDate } from '../../route'

// Admin confirms a recurring draft — converts to real expense and advances schedule
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

  const body = await req.json().catch(() => ({}))
  const paidBy: string = body.paidBy ?? session.user.id

  const expenseId = crypto.randomUUID()
  const splits: Array<{ userId: string; amount: string }> = JSON.parse(template.splits ?? '[]')

  await db.transaction(async (tx) => {
    await tx.insert(expenses).values({
      id: expenseId,
      householdId,
      title: template.title,
      amount: template.totalAmount,
      categoryId: template.categoryId,
      notes: template.notes,
      paidBy,
      isRecurringDraft: false,
      recurringTemplateId: template.id,
    })

    if (splits.length > 0) {
      await tx.insert(expenseSplits).values(
        splits.map(s => ({
          id: crypto.randomUUID(),
          expenseId,
          householdId,
          userId: s.userId,
          amount: s.amount,
        }))
      )
    }

    const nextDate = advanceRecurringDate(new Date(template.nextDueDate), template.frequency)
    await tx
      .update(recurringExpenses)
      .set({ nextDueDate: nextDate, lastPostedAt: new Date() })
      .where(eq(recurringExpenses.id, id))
  })

  return NextResponse.json({ expenseId })
}
