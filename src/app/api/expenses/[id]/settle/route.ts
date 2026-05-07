import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseSplits } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

// Settle a single split (simple case)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expense = await db
    .select({ paidBy: expenses.paidBy })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.householdId, householdId), isNull(expenses.deletedAt)))
    .then(r => r[0] ?? null)

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = role === 'admin'
  const isPayer = expense.paidBy === session.user.id
  if (!isPayer && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { splitId } = await req.json()
  if (!splitId) return NextResponse.json({ error: 'splitId required' }, { status: 400 })

  await db
    .update(expenseSplits)
    .set({ settled: true, settledAt: new Date() })
    .where(and(eq(expenseSplits.id, splitId), eq(expenseSplits.expenseId, id)))

  return NextResponse.json({ ok: true })
}
