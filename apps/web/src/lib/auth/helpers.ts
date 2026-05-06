import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'
import { db } from '@/lib/db'
import { householdMembers, households } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { NextRequest } from 'next/server'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function getUserHousehold(userId: string) {
  const row = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      household: {
        name: households.name,
        subscriptionStatus: households.subscription_status,
      },
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
    .orderBy(desc(householdMembers.createdAt))
    .limit(1)
    .then(r => r[0] ?? null)

  return row
}

export async function requireHouseholdAdmin(
  _request: NextRequest,
  householdId: string,
): Promise<{ userId: string }> {
  const session = await getSession()
  if (!session) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const [membership] = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!membership) {
    throw Response.json({ error: 'Not a member' }, { status: 403 })
  }
  if (membership.role !== 'admin') {
    throw Response.json({ error: 'Admin only' }, { status: 403 })
  }
  return { userId }
}
