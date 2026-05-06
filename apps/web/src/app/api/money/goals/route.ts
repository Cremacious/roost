import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { savingsGoals, goalContributions, users } from '@/db/schema'
import { eq, and, isNull, sum, inArray } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { householdId } = membership

  const goals = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.householdId, householdId), isNull(savingsGoals.deletedAt)))
    .orderBy(savingsGoals.createdAt)

  if (goals.length === 0) return NextResponse.json({ goals: [] })

  const goalIds = goals.map(g => g.id)

  const contributionTotals = await db
    .select({
      goalId: goalContributions.goalId,
      total: sum(goalContributions.amount),
    })
    .from(goalContributions)
    .where(inArray(goalContributions.goalId, goalIds))
    .groupBy(goalContributions.goalId)

  const totalsByGoalId = new Map(contributionTotals.map(r => [r.goalId, parseFloat(r.total ?? '0')]))

  const result = goals.map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    targetDate: g.targetDate,
    description: g.description,
    completedAt: g.completedAt,
    createdBy: g.createdBy,
    createdAt: g.createdAt,
    savedAmount: totalsByGoalId.get(g.id) ?? 0,
    progressPercent: Math.min(
      100,
      Math.round(((totalsByGoalId.get(g.id) ?? 0) / parseFloat(g.targetAmount)) * 100)
    ),
  }))

  return NextResponse.json({ goals: result })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'SAVINGS_GOALS_PREMIUM' }, { status: 403 })
  }

  const body = await req.json()
  const { name, targetAmount, targetDate, description } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!targetAmount || isNaN(parseFloat(targetAmount)) || parseFloat(targetAmount) <= 0) {
    return NextResponse.json({ error: 'Invalid target amount' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  await db.insert(savingsGoals).values({
    id,
    householdId,
    name: name.trim(),
    targetAmount: parseFloat(targetAmount).toFixed(2),
    targetDate: targetDate ?? null,
    description: description?.trim() ?? null,
    createdBy: session.user.id,
  })

  return NextResponse.json({ id }, { status: 201 })
}
