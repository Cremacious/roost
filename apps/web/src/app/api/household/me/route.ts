import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const [householdRow, members] = await Promise.all([
    db
      .select({
        id: households.id,
        name: households.name,
        inviteCode: households.inviteCode,
        adminId: households.adminId,
      })
      .from(households)
      .where(and(eq(households.id, householdId), isNull(households.deletedAt)))
      .limit(1)
      .then(r => r[0] ?? null),

    db
      .select({
        userId: householdMembers.userId,
        role: householdMembers.role,
        joinedAt: householdMembers.createdAt,
        name: users.name,
        avatarColor: users.avatarColor,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          isNull(householdMembers.deletedAt),
        )
      ),
  ])

  if (!householdRow) return NextResponse.json({ error: 'Household not found' }, { status: 404 })

  return NextResponse.json({
    household: householdRow,
    role: membership.role,
    members: members.map(m => ({
      userId: m.userId,
      name: m.name,
      avatarColor: m.avatarColor,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
  })
}
