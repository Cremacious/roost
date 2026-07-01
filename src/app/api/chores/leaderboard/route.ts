import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { choreCompletions, householdMembers, users } from '@/db/schema'
import { eq, and, isNull, gte, sql } from 'drizzle-orm'

function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

// Local-time YYYY-MM-DD key (matches the rest of the chores day math).
function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Consecutive days (ending today, or yesterday if nothing done yet today) on
// which the member completed at least one chore. Missing a day breaks it.
function computeStreak(dayKeys: Set<string>): number {
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!dayKeys.has(ymdLocal(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!dayKeys.has(ymdLocal(cursor))) return 0
  }
  let streak = 0
  while (dayKeys.has(ymdLocal(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const isPremium = membership.household.subscriptionStatus === 'premium'
  if (!isPremium) {
    return NextResponse.json(
      { error: 'The chore leaderboard is a premium feature', code: 'LEADERBOARD_PREMIUM' },
      { status: 403 },
    )
  }

  const weekStart = getCurrentWeekStart()

  // Look back far enough to measure an ongoing streak.
  const streakSince = new Date()
  streakSince.setDate(streakSince.getDate() - 90)
  streakSince.setHours(0, 0, 0, 0)

  const [members, weekCompletions, recentCompletions] = await Promise.all([
    db
      .select({
        userId: householdMembers.userId,
        name: users.name,
        avatarColor: users.avatarColor,
        role: householdMembers.role,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          isNull(householdMembers.deletedAt),
        )
      ),

    db
      .select({
        userId: choreCompletions.userId,
        points: sql<number>`sum(${choreCompletions.points})::int`,
        completions: sql<number>`count(*)::int`,
      })
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.householdId, householdId),
          eq(choreCompletions.weekStart, weekStart),
        )
      )
      .groupBy(choreCompletions.userId),

    db
      .select({
        userId: choreCompletions.userId,
        completedAt: choreCompletions.completedAt,
      })
      .from(choreCompletions)
      .where(
        and(
          eq(choreCompletions.householdId, householdId),
          gte(choreCompletions.completedAt, streakSince),
        )
      ),
  ])

  const pointsMap = new Map(weekCompletions.map(r => [r.userId, { points: r.points, completions: r.completions }]))

  // Group completion days per member, then measure each member's streak.
  const dayKeysByUser = new Map<string, Set<string>>()
  for (const c of recentCompletions) {
    if (!c.completedAt) continue
    const key = ymdLocal(c.completedAt)
    const set = dayKeysByUser.get(c.userId) ?? new Set<string>()
    set.add(key)
    dayKeysByUser.set(c.userId, set)
  }
  const streakMap = new Map<string, number>()
  for (const [userId, set] of dayKeysByUser) {
    streakMap.set(userId, computeStreak(set))
  }

  const leaderboard = members
    .map(m => ({
      userId: m.userId,
      name: m.name ?? 'Unknown',
      avatarColor: m.avatarColor,
      role: m.role,
      points: pointsMap.get(m.userId)?.points ?? 0,
      completions: pointsMap.get(m.userId)?.completions ?? 0,
      streak: streakMap.get(m.userId) ?? 0,
    }))
    .sort((a, b) => b.points - a.points)

  return NextResponse.json({ leaderboard, weekStart })
}
