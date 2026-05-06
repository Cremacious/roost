import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { savingsGoals, goalContributions, users } from '@/db/schema'
import { eq, and, isNull, sum, desc } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const [contributions, perMember] = await Promise.all([
    db
      .select({
        id: goalContributions.id,
        userId: goalContributions.userId,
        userName: users.name,
        amount: goalContributions.amount,
        note: goalContributions.note,
        createdAt: goalContributions.createdAt,
      })
      .from(goalContributions)
      .leftJoin(users, eq(goalContributions.userId, users.id))
      .where(eq(goalContributions.goalId, id))
      .orderBy(desc(goalContributions.createdAt)),

    db
      .select({
        userId: goalContributions.userId,
        userName: users.name,
        total: sum(goalContributions.amount),
      })
      .from(goalContributions)
      .leftJoin(users, eq(goalContributions.userId, users.id))
      .where(eq(goalContributions.goalId, id))
      .groupBy(goalContributions.userId, users.name),
  ])

  return NextResponse.json({
    contributions: contributions.map(c => ({
      ...c,
      amount: parseFloat(c.amount),
    })),
    perMember: perMember.map(m => ({
      userId: m.userId,
      userName: m.userName ?? 'Unknown',
      total: parseFloat(m.total ?? '0'),
    })),
  })
}
