import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseSplits } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// Creditor disputes claim — resets payer's claim flag
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { splitIds } = await req.json()
  if (!splitIds?.length) return NextResponse.json({ error: 'splitIds required' }, { status: 400 })

  const splitRows = await db
    .select({ id: expenseSplits.id, expenseId: expenseSplits.expenseId })
    .from(expenseSplits)
    .where(and(eq(expenseSplits.householdId, householdId), inArray(expenseSplits.id, splitIds)))

  const expenseIds = [...new Set(splitRows.map(s => s.expenseId))]
  const expenseRows = await db
    .select({ id: expenses.id, paidBy: expenses.paidBy })
    .from(expenses)
    .where(inArray(expenses.id, expenseIds))

  const paidByMap = new Map(expenseRows.map(e => [e.id, e.paidBy]))
  const invalid = splitRows.some(s => paidByMap.get(s.expenseId) !== session.user.id)
  if (invalid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db
    .update(expenseSplits)
    .set({ settledByPayer: false, settlementDisputed: true })
    .where(inArray(expenseSplits.id, splitIds))

  return NextResponse.json({ ok: true })
}
