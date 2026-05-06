import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { expenseSplits, expenses } from '@/db/schema'
import { eq, and, isNull, lte } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Find splits where debtor claimed (settledByPayer=true) but payee hasn't confirmed.
  // Use the expense createdAt as a proxy for claim age — if the expense is old and
  // still has a pending claim, it's stale enough to warrant a reminder.
  const staleClaims = await db
    .select({
      splitId: expenseSplits.id,
      expenseId: expenseSplits.expenseId,
      debtorId: expenseSplits.userId,
      lastReminded: expenseSplits.settlementLastRemindedAt,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(
      and(
        eq(expenseSplits.settledByPayer, true),
        eq(expenseSplits.settled, false),
        lte(expenses.createdAt, sevenDaysAgo)
      )
    )

  let notified = 0

  for (const claim of staleClaims) {
    // Find the expense to get the creditor (paidBy)
    const expense = await db
      .select({ paidBy: expenses.paidBy, title: expenses.title })
      .from(expenses)
      .where(eq(expenses.id, claim.expenseId ?? ''))
      .then(r => r[0] ?? null)

    if (!expense) continue

    // TODO: send push notification to creditor when Expo app is ready
    // For now just log — web has no push capability
    console.log(
      `settlement-reminders: stale claim on expense "${expense.title}", ` +
      `debtor ${claim.debtorId} → creditor ${expense.paidBy}`
    )

    notified++
  }

  console.log(`settlement-reminders cron: notified ${notified} payees of stale claims`)

  return NextResponse.json({ notified })
}
