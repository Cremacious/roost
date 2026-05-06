import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { rewardRules, rewardPayouts, chores, choreCompletions, householdMembers, users } from '@/db/schema'
import { eq, and, isNull, gte, lt, sql } from 'drizzle-orm'

export function getPeriodBounds(
  periodType: string,
  startsAt: Date,
  periodDays: number | null,
  now = new Date()
): { start: Date; end: Date } {
  if (periodType === 'week') {
    const d = new Date(now)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setDate(d.getDate() + 7)
    return { start: d, end }
  }
  if (periodType === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { start, end }
  }
  if (periodType === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear() + 1, 0, 1)
    return { start, end }
  }
  // custom: from startsAt, repeating every periodDays days
  const pDays = periodDays ?? 7
  const elapsed = now.getTime() - startsAt.getTime()
  const periodMs = pDays * 86_400_000
  const idx = Math.max(0, Math.floor(elapsed / periodMs))
  const start = new Date(startsAt.getTime() + idx * periodMs)
  const end = new Date(start.getTime() + periodMs)
  return { start, end }
}

async function computeProgress(
  householdId: string,
  childUserId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const [assignedChores, completionsInPeriod] = await Promise.all([
    db
      .select({ id: chores.id })
      .from(chores)
      .where(
        and(
          eq(chores.householdId, householdId),
          eq(chores.assignedTo, childUserId),
          isNull(chores.deletedAt),
        )
      ),

    db
      .select({ choreId: choreCompletions.choreId })
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.householdId, householdId),
          eq(choreCompletions.userId, childUserId),
          gte(choreCompletions.completedAt, periodStart),
          lt(choreCompletions.completedAt, periodEnd),
        )
      )
      .groupBy(choreCompletions.choreId),
  ])

  const total = assignedChores.length
  if (total === 0) return { completionRate: 100, completed: 0, total: 0 }
  const completed = completionsInPeriod.length
  const rate = Math.round((completed / total) * 100)
  return { completionRate: rate, completed, total }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  const isPremium = membership.household.subscriptionStatus === 'premium'

  // Admin sees all rules with progress; non-admin returns 403
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const rules = await db
    .select({
      id: rewardRules.id,
      userId: rewardRules.userId,
      title: rewardRules.title,
      periodType: rewardRules.periodType,
      periodDays: rewardRules.periodDays,
      thresholdPercent: rewardRules.thresholdPercent,
      rewardType: rewardRules.rewardType,
      rewardDetail: rewardRules.rewardDetail,
      startsAt: rewardRules.startsAt,
      enabled: rewardRules.enabled,
      createdAt: rewardRules.createdAt,
      childName: users.name,
      childAvatarColor: users.avatarColor,
    })
    .from(rewardRules)
    .innerJoin(users, eq(rewardRules.userId, users.id))
    .where(
      and(
        eq(rewardRules.householdId, householdId),
        isNull(rewardRules.deletedAt),
      )
    )
    .orderBy(rewardRules.createdAt)

  const now = new Date()
  const rulesWithProgress = await Promise.all(
    rules.map(async rule => {
      const { start, end } = getPeriodBounds(rule.periodType, rule.startsAt, rule.periodDays, now)
      const progress = await computeProgress(householdId, rule.userId, start, end)
      return {
        ...rule,
        startsAt: rule.startsAt.toISOString(),
        createdAt: rule.createdAt.toISOString(),
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
        ...progress,
      }
    })
  )

  // Get child members for the create form
  const childMembers = await db
    .select({
      userId: householdMembers.userId,
      name: users.name,
      avatarColor: users.avatarColor,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.role, 'child'),
        isNull(householdMembers.deletedAt),
      )
    )

  return NextResponse.json({ rules: rulesWithProgress, childMembers, isPremium })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  const isPremium = membership.household.subscriptionStatus === 'premium'

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  if (!isPremium) {
    return NextResponse.json({ error: 'Premium required', code: 'ALLOWANCES_PREMIUM' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.userId || !body?.title?.trim() || !body?.rewardDetail?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const {
    userId,
    title,
    periodType = 'week',
    periodDays = null,
    thresholdPercent = 80,
    rewardType = 'money',
    rewardDetail,
    startsAt,
  } = body

  if (thresholdPercent < 1 || thresholdPercent > 100) {
    return NextResponse.json({ error: 'Threshold must be 1-100' }, { status: 400 })
  }

  const [rule] = await db
    .insert(rewardRules)
    .values({
      householdId,
      userId,
      title: title.trim(),
      periodType,
      periodDays: periodDays ?? null,
      thresholdPercent,
      rewardType,
      rewardDetail: rewardDetail.trim(),
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ rule })
}
