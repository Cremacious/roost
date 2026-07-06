import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rewardRules, rewardPayouts, chores, choreCompletions, expenses, expenseSplits, householdMembers } from '@/db/schema'
import { eq, and, isNull, gte, lt } from 'drizzle-orm'
import { getPeriodBounds } from '@/app/api/rewards/route'
import { logActivity } from '@/lib/utils/activity'

// Returns the period that just completed before the current one
function getCompletedPeriodBounds(
  periodType: string,
  startsAt: Date,
  periodDays: number | null,
  now = new Date()
): { start: Date; end: Date } {
  const current = getPeriodBounds(periodType, startsAt, periodDays, now)
  // Go 1ms before the current period start to land inside the previous period
  const prevMoment = new Date(current.start.getTime() - 1)
  return getPeriodBounds(periodType, startsAt, periodDays, prevMoment)
}

async function computeProgress(
  householdId: string,
  userId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const [assignedChores, completionsInPeriod] = await Promise.all([
    db
      .select({ id: chores.id })
      .from(chores)
      .where(and(eq(chores.householdId, householdId), eq(chores.assignedTo, userId), isNull(chores.deletedAt))),
    db
      .select({ choreId: choreCompletions.choreId })
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.householdId, householdId),
          eq(choreCompletions.userId, userId),
          gte(choreCompletions.completedAt, periodStart),
          lt(choreCompletions.completedAt, periodEnd)
        )
      )
      .groupBy(choreCompletions.choreId),
  ])

  const total = assignedChores.length
  if (total === 0) return { completionRate: 100, completed: 0, total: 0 }
  const completed = completionsInPeriod.length
  return { completionRate: Math.round((completed / total) * 100), completed, total }
}

// Find the admin (oldest admin member) for a household to use as expense paid_by
async function getHouseholdAdmin(householdId: string): Promise<string | null> {
  const admins = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.role, 'admin'),
        isNull(householdMembers.deletedAt)
      )
    )
    .limit(1)
  return admins[0]?.userId ?? null
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Get all active, non-deleted reward rules
  const rules = await db
    .select()
    .from(rewardRules)
    .where(and(eq(rewardRules.enabled, true), isNull(rewardRules.deletedAt)))

  let payoutsCreated = 0
  let expensesCreated = 0

  for (const rule of rules) {
    try {
      const { start: periodStart, end: periodEnd } = getCompletedPeriodBounds(
        rule.periodType,
        new Date(rule.startsAt),
        rule.periodDays,
        now
      )

      // Idempotency: skip if a payout already exists for this period
      const existing = await db
        .select({ id: rewardPayouts.id })
        .from(rewardPayouts)
        .where(
          and(
            eq(rewardPayouts.ruleId, rule.id),
            eq(rewardPayouts.userId, rule.userId),
            eq(rewardPayouts.periodStart, periodStart)
          )
        )
        .limit(1)

      if (existing.length > 0) continue

      // Compute completion rate for the member in the completed period
      const { completionRate, completed, total } = await computeProgress(
        rule.householdId,
        rule.userId,
        periodStart,
        periodEnd
      )

      const earned = completionRate >= rule.thresholdPercent

      let expenseId: string | null = null

      // For earned money rewards, create an expense entry so it appears in settle-up
      if (earned && rule.rewardType === 'money') {
        const rewardAmount = parseFloat(rule.rewardDetail.replace(/[^0-9.]/g, ''))
        if (!isNaN(rewardAmount) && rewardAmount > 0) {
          const adminId = await getHouseholdAdmin(rule.householdId)
          if (adminId) {
            // Expense: member earned money, admin owes member
            // paid_by = member (the one owed), split = admin owes member the full amount
            const [expense] = await db
              .insert(expenses)
              .values({
                householdId: rule.householdId,
                title: `Reward: ${rule.title}`,
                amount: String(rewardAmount),
                paidBy: rule.userId,
                notes: `Earned reward for completing ${completionRate}% of assigned chores`,
              })
              .returning({ id: expenses.id })

            await db.insert(expenseSplits).values({
              expenseId: expense.id,
              householdId: rule.householdId,
              userId: adminId,
              amount: String(rewardAmount),
              settled: false,
            })

            expenseId = expense.id
            expensesCreated++
          }
        }
      }

      // Record the payout
      await db.insert(rewardPayouts).values({
        householdId: rule.householdId,
        userId: rule.userId,
        ruleId: rule.id,
        periodStart,
        periodEnd,
        earned,
        completionRate,
        rewardDetail: rule.rewardDetail,
        expenseId,
        acknowledged: false,
      })

      // Log only when the reward was actually earned this period.
      if (earned) {
        await logActivity({
          householdId: rule.householdId,
          userId: rule.userId,
          type: 'allowance_earned',
          entityId: rule.id,
          entityType: 'reward',
          description: `earned the "${rule.title}" reward`,
        })
      }

      payoutsCreated++
    } catch (err) {
      console.error(`Failed to process reward rule ${rule.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, payoutsCreated, expensesCreated })
}
