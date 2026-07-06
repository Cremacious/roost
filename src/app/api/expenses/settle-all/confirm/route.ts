import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseSplits, users } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

// Creditor confirms receipt of payment
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { debtorId, splitIds } = await req.json()
  if (!debtorId || !splitIds?.length) {
    return NextResponse.json({ error: 'debtorId and splitIds required' }, { status: 400 })
  }

  // verify splits belong to this household, debtor is debtorId, and current user is the creditor (paidBy)
  const splitRows = await db
    .select({
      id: expenseSplits.id,
      userId: expenseSplits.userId,
      expenseId: expenseSplits.expenseId,
      amount: expenseSplits.amount,
      settledByPayer: expenseSplits.settledByPayer,
    })
    .from(expenseSplits)
    .where(and(eq(expenseSplits.householdId, householdId), inArray(expenseSplits.id, splitIds)))

  if (splitRows.length !== splitIds.length) {
    return NextResponse.json({ error: 'Invalid splits' }, { status: 400 })
  }

  const expenseIds = [...new Set(splitRows.map(s => s.expenseId))]
  const expenseRows = await db
    .select({ id: expenses.id, paidBy: expenses.paidBy })
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))

  const paidByMap = new Map(expenseRows.map(e => [e.id, e.paidBy]))
  const invalidSplit = splitRows.some(s => paidByMap.get(s.expenseId) !== session.user.id || s.userId !== debtorId)
  if (invalidSplit) return NextResponse.json({ error: 'Invalid splits' }, { status: 400 })

  await db
    .update(expenseSplits)
    .set({ settled: true, settledByPayee: true, settledAt: new Date(), settlementDisputed: false })
    .where(inArray(expenseSplits.id, splitIds))

  const [debtor] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, debtorId))
    .limit(1)
  const total = splitRows.reduce((sum, s) => sum + parseFloat(s.amount), 0)

  await logActivity({
    householdId,
    userId: session.user.id,
    type: 'expense_settled',
    entityType: 'expense',
    description: `settled up with ${debtor?.name ?? 'a housemate'} ($${total.toFixed(2)})`,
  })

  return NextResponse.json({ ok: true })
}
