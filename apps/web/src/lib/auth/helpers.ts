import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'
import { db } from '@/lib/db'
import { householdMembers, households } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

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
