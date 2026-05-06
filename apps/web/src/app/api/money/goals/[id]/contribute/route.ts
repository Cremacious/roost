import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { savingsGoals, goalContributions } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { householdId } = membership

  const goal = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.householdId, householdId), isNull(savingsGoals.deletedAt)))
    .then(r => r[0] ?? null)

  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (goal.completedAt) return NextResponse.json({ error: 'Goal already completed' }, { status: 400 })

  const body = await req.json()
  const { amount, note } = body

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const contributionId = crypto.randomUUID()
  await db.insert(goalContributions).values({
    id: contributionId,
    goalId: id,
    householdId,
    userId: session.user.id,
    amount: parseFloat(amount).toFixed(2),
    note: note?.trim() ?? null,
  })

  return NextResponse.json({ id: contributionId }, { status: 201 })
}
