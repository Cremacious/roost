import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { householdId?: string }
  if (!body.householdId) {
    return NextResponse.json({ error: 'householdId required' }, { status: 400 })
  }

  const userId = session.user.id

  // Validate membership
  const [membership] = await db
    .select({
      role: householdMembers.role,
      householdName: households.name,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, body.householdId),
        isNull(householdMembers.deletedAt),
        isNull(households.deleted_at),
      )
    )
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
  }

  // Children cannot switch households
  if (membership.role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Write active household
  await db
    .update(users)
    .set({ activeHouseholdId: body.householdId, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return NextResponse.json({
    ok: true,
    household: {
      id: body.householdId,
      name: membership.householdName,
      role: membership.role,
    },
  })
}
