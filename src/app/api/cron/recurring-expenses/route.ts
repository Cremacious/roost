import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { recurringExpenses, expenses, expenseSplits, householdMembers } from '@/db/schema'
import { eq, and, isNull, lte } from 'drizzle-orm'
import { advanceRecurringDate } from '@/app/api/expenses/recurring/route'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all non-paused templates where next_due_date <= today
  const dueTemplates = await db
    .select()
    .from(recurringExpenses)
    .where(
      and(
        isNull(recurringExpenses.deletedAt),
        eq(recurringExpenses.paused, false),
        lte(recurringExpenses.nextDueDate, now)
      )
    )

  let created = 0
  let skipped = 0

  for (const template of dueTemplates) {
    // Check if a draft already exists for this template
    const existingDraft = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.recurringTemplateId, template.id),
          eq(expenses.isRecurringDraft, true),
          isNull(expenses.deletedAt)
        )
      )
      .then(r => r[0] ?? null)

    if (existingDraft) {
      // Already has a pending draft — check if it's stale (>3 days) and remind admin
      const draftAge = (now.getTime() - new Date(template.nextDueDate).getTime()) / (1000 * 60 * 60 * 24)
      if (draftAge > 3) {
        // TODO: send push notification to admin when Expo app is ready
        console.log(`Stale draft for template ${template.id} (${template.title}), ${Math.floor(draftAge)} days old`)
      }
      skipped++
      continue
    }

    // Create a draft expense
    const expenseId = crypto.randomUUID()
    const splits: Array<{ userId: string; amount: string }> = JSON.parse(template.splits ?? '[]')

    await db.transaction(async tx => {
      await tx.insert(expenses).values({
        id: expenseId,
        householdId: template.householdId,
        title: template.title,
        amount: template.totalAmount,
        categoryId: template.categoryId,
        notes: template.notes,
        paidBy: template.createdBy,
        isRecurringDraft: true,
        recurringTemplateId: template.id,
      })

      if (splits.length > 0) {
        await tx.insert(expenseSplits).values(
          splits.map(s => ({
            id: crypto.randomUUID(),
            expenseId,
            householdId: template.householdId,
            userId: s.userId,
            amount: s.amount,
          }))
        )
      }
    })

    created++
  }

  console.log(`recurring-expenses cron: created ${created} drafts, skipped ${skipped} (already pending)`)

  return NextResponse.json({ created, skipped })
}
