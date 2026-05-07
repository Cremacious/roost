import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Get active household id preference for this user
  const [userRow] = await db
    .select({ activeHouseholdId: users.activeHouseholdId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const activeHouseholdId = userRow?.activeHouseholdId ?? null

  // Get all active memberships with household info
  const rows = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      householdName: households.name,
      subscriptionStatus: households.subscription_status,
      joinedAt: householdMembers.createdAt,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
        isNull(households.deleted_at),
      )
    )
    .orderBy(householdMembers.createdAt)

  // Get member counts per household
  const memberCounts: Record<string, number> = {}
  if (rows.length > 0) {
    const counts = await db
      .select({
        householdId: householdMembers.householdId,
        count: sql<number>`count(*)`,
      })
      .from(householdMembers)
      .where(isNull(householdMembers.deletedAt))
      .groupBy(householdMembers.householdId)
    for (const c of counts) {
      memberCounts[c.householdId] = Number(c.count)
    }
  }

  // Determine which household is "active": explicit preference or most recently joined (last in list)
  const effectiveActiveId =
    activeHouseholdId && rows.some(r => r.householdId === activeHouseholdId)
      ? activeHouseholdId
      : rows[rows.length - 1]?.householdId ?? null

  const result = rows.map(r => ({
    id: r.householdId,
    name: r.householdName,
    role: r.role,
    memberCount: memberCounts[r.householdId] ?? 1,
    isPremium: r.subscriptionStatus === 'premium',
    isActive: r.householdId === effectiveActiveId,
  }))

  return NextResponse.json({ households: result })
}
