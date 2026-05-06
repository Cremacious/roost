import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseSplits } from '@/db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'

// Debtor claims they paid creditor (initiates two-sided settlement)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { creditorId, splitIds } = await req.json()
  if (!creditorId || !splitIds?.length) {
    return NextResponse.json({ error: 'creditorId and splitIds required' }, { status: 400 })
  }

  // verify all splits belong to this household and debtor is current user
  const splits = await db
    .select({ id: expenseSplits.id, userId: expenseSplits.userId, expenseId: expenseSplits.expenseId })
    .from(expenseSplits)
    .where(and(eq(expenseSplits.householdId, householdId), inArray(expenseSplits.id, splitIds)))

  const invalid = splits.some(s => s.userId !== session.user.id)
  if (invalid || splits.length !== splitIds.length) {
    return NextResponse.json({ error: 'Invalid splits' }, { status: 400 })
  }

  await db
    .update(expenseSplits)
    .set({ settledByPayer: true, settlementDisputed: false })
    .where(inArray(expenseSplits.id, splitIds))

  return NextResponse.json({ ok: true })
}
