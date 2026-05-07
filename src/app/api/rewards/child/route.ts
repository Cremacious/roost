import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { rewardRules, rewardPayouts, chores, choreCompletions, users } from '@/db/schema'
import { eq, and, isNull, gte, lt, desc } from 'drizzle-orm'
import { getPeriodBounds } from '../route'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const userId = session.user.id
  const isPremium = membership.household.subscriptionStatus === 'premium'

  if (!isPremium) {
    return NextResponse.json({ rules: [], payouts: [], isPremium: false })
  }

  const [rules, payoutHistory] = await Promise.all([
    db
      .select()
      .from(rewardRules)
      .where(
        and(
          eq(rewardRules.householdId, householdId),
          eq(rewardRules.userId, userId),
          eq(rewardRules.enabled, true),
          isNull(rewardRules.deletedAt),
        )
      )
      .orderBy(rewardRules.createdAt),

    db
      .select()
      .from(rewardPayouts)
      .where(
        and(
          eq(rewardPayouts.householdId, householdId),
          eq(rewardPayouts.userId, userId),
        )
      )
      .orderBy(desc(rewardPayouts.createdAt))
      .limit(12),
  ])

  const now = new Date()

  const rulesWithProgress = await Promise.all(
    rules.map(async rule => {
      const { start, end } = getPeriodBounds(rule.periodType, rule.startsAt, rule.periodDays, now)

      const [assignedChores, completionsInPeriod] = await Promise.all([
        db
          .select({ id: chores.id })
          .from(chores)
          .where(
            and(
              eq(chores.householdId, householdId),
              eq(chores.assignedTo, userId),
              isNull(chores.deletedAt),
            )
          ),

        db
          .select({ choreId: choreCompletions.choreId })
          .from(choreCompletions)
          .where(
            and(
              eq(choreCompletions.householdId, householdId),
              eq(choreCompletions.userId, userId),
              gte(choreCompletions.completedAt, start),
              lt(choreCompletions.completedAt, end),
            )
          )
          .groupBy(choreCompletions.choreId),
      ])

      const total = assignedChores.length
      const completed = completionsInPeriod.length
      const completionRate = total === 0 ? 100 : Math.round((completed / total) * 100)

      return {
        id: rule.id,
        title: rule.title,
        periodType: rule.periodType,
        periodDays: rule.periodDays,
        thresholdPercent: rule.thresholdPercent,
        rewardType: rule.rewardType,
        rewardDetail: rule.rewardDetail,
        startsAt: rule.startsAt.toISOString(),
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        completionRate,
        completed,
        total,
      }
    })
  )

  return NextResponse.json({
    rules: rulesWithProgress,
    payouts: payoutHistory.map(p => ({
      ...p,
      periodStart: p.periodStart.toISOString(),
      periodEnd: p.periodEnd.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
    isPremium: true,
  })
}
