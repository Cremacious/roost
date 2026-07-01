import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { recurringExpenses, expenses } from '@/db/schema'
import { eq, and, isNull, gte } from 'drizzle-orm'

function getBillStatus(dueDay: number | null, hasDraftPosted: boolean): 'paid' | 'due_soon' | 'overdue' | 'upcoming' {
  if (hasDraftPosted) return 'paid'
  if (!dueDay) return 'upcoming'

  const now = new Date()
  const currentDay = now.getDate()
  const daysUntil = dueDay - currentDay

  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 7) return 'due_soon'
  return 'upcoming'
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [billTemplates, draftExpenses] = await Promise.all([
    // All recurring templates for the household. Both "bills" (isBill=true) and
    // recurring expense templates (isBill=false) surface here so they can be
    // edited / paused / resumed from the same Bills tab (issues #77, #78).
    db
      .select()
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.householdId, householdId),
          isNull(recurringExpenses.deletedAt)
        )
      ),

    // expenses posted this month from bill templates (is_recurring_draft=false, recurring_template_id set)
    db
      .select({ recurringTemplateId: expenses.recurringTemplateId })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, householdId),
          eq(expenses.isRecurringDraft, false),
          isNull(expenses.deletedAt),
          gte(expenses.createdAt, monthStart)
        )
      ),
  ])

  const postedThisMonth = new Set(
    draftExpenses
      .filter(e => e.recurringTemplateId)
      .map(e => e.recurringTemplateId!)
  )

  const bills = billTemplates.map(t => {
    const paid = postedThisMonth.has(t.id)
    const status = getBillStatus(t.dueDay, paid)
    return {
      id: t.id,
      title: t.title,
      amount: t.totalAmount,
      dueDay: t.dueDay,
      frequency: t.frequency,
      categoryId: t.categoryId,
      paused: t.paused,
      status,
      splits: JSON.parse(t.splits ?? '[]'),
    }
  }).sort((a, b) => (a.dueDay ?? 32) - (b.dueDay ?? 32))

  const total = bills.reduce((s, b) => s + parseFloat(b.amount), 0)
  const paid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + parseFloat(b.amount), 0)

  return NextResponse.json({
    bills,
    summary: {
      total: Math.round(total * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      remaining: Math.round((total - paid) * 100) / 100,
    },
  })
}
