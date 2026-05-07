import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { choreCompletions, householdMembers, users } from '@/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

function getCurrentWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const weekStart = getCurrentWeekStart()

  const [members, weekCompletions] = await Promise.all([
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
  ])

  const pointsMap = new Map(weekCompletions.map(r => [r.userId, { points: r.points, completions: r.completions }]))

  const leaderboard = members
    .map(m => ({
      userId: m.userId,
      name: m.name ?? 'Unknown',
      avatarColor: m.avatarColor,
      role: m.role,
      points: pointsMap.get(m.userId)?.points ?? 0,
      completions: pointsMap.get(m.userId)?.completions ?? 0,
    }))
    .sort((a, b) => b.points - a.points)

  return NextResponse.json({ leaderboard, weekStart })
}
